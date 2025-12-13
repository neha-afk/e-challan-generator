-- 1. Computed Stock Function
CREATE OR REPLACE FUNCTION get_stock_available(p_id UUID)
RETURNS NUMERIC AS $$
BEGIN
  RETURN (
    SELECT COALESCE(SUM(quantity), 0)
    FROM stock_ledger
    WHERE product_id = p_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Trigger: Auto-complete Manufacturing Order
-- Checks if ALL sibling work orders are 'completed'. If so, sets MO to 'done'.
CREATE OR REPLACE FUNCTION check_complete_mo()
RETURNS TRIGGER AS $$
DECLARE
  v_pending_count INT;
BEGIN
  -- Count how many work orders for this MO are NOT completed
  SELECT COUNT(*) INTO v_pending_count
  FROM work_orders
  WHERE mo_id = NEW.mo_id
    AND status != 'completed';

  -- If 0 pending, update MO to done.
  -- Only update if it's not already done or canceled
  IF v_pending_count = 0 THEN
    UPDATE manufacturing_orders
    SET status = 'done',
        end_date = NOW()
    WHERE id = NEW.mo_id
      AND status NOT IN ('done', 'canceled');
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_check_complete_mo
AFTER UPDATE OF status ON work_orders
FOR EACH ROW
WHEN (NEW.status = 'completed')
EXECUTE PROCEDURE check_complete_mo();


-- 3. Trigger: Stock Movements on MO Completion (Backflush)
-- When MO becomes 'done':
--    a) Add Finished Product to Stock (IN)
--    b) Consume Components from Stock (OUT) based on BOM
CREATE OR REPLACE FUNCTION process_mo_completion()
RETURNS TRIGGER AS $$
DECLARE
  v_bom_id UUID;
  v_comp RECORD;
BEGIN
  -- 1. Stock IN: Finished Product
  INSERT INTO stock_ledger (product_id, quantity, transaction_type, reference_document)
  VALUES (
    NEW.product_id, 
    NEW.quantity, 
    'in', 
    jsonb_build_object('type', 'mo_finished', 'mo_id', NEW.id)
  );

  -- 2. Find the BOM for this product
  -- Assuming 1 active BOM per product for simplicity. 
  -- In complex systems, MO has valid_bom_id. Here we search.
  SELECT id INTO v_bom_id FROM bill_of_materials WHERE product_id = NEW.product_id LIMIT 1;

  IF v_bom_id IS NOT NULL THEN
    -- 3. Stock OUT: Consume Components
    FOR v_comp IN 
      SELECT component_id, quantity 
      FROM bom_components 
      WHERE bom_id = v_bom_id
    LOOP
      INSERT INTO stock_ledger (product_id, quantity, transaction_type, reference_document)
      VALUES (
        v_comp.component_id, 
        -1 * (v_comp.quantity * NEW.quantity), -- Negative quantity for OUT
        'out',
        jsonb_build_object('type', 'mo_consumption', 'mo_id', NEW.id, 'component_id', v_comp.component_id)
      );
    END LOOP;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_mo_completion_stock
AFTER UPDATE OF status ON manufacturing_orders
FOR EACH ROW
WHEN (NEW.status = 'done' AND OLD.status != 'done')
EXECUTE PROCEDURE process_mo_completion();
