-- Clear existing data (optional, be careful in production!)
-- TRUNCATE TABLE manufacturing_orders, work_orders, stock_ledger, bom_operations, bom_components, bill_of_materials, work_centers, products CASCADE;

-- 1. Create Work Centers
INSERT INTO work_centers (name, hourly_cost, capacity) VALUES 
('Assembly Line', 20.00, 1),
('Paint Floor', 15.00, 2);

-- 2. Create Products
-- We need to capture IDs to use in BOMs. Using CTEs or DO block for better handling, 
-- but standard seed.sql often uses static UUIDs or relies on names if simple. 
-- For robustness, I'll use a DO block to Insert and capture IDs.

DO $$
DECLARE
  v_assembly_id UUID;
  v_paint_id UUID;
  v_table_id UUID;
  v_chair_id UUID;
  v_legs_id UUID;
  v_top_id UUID;
  v_screw_id UUID;
  v_varnish_id UUID;
  v_bom_id UUID;
  v_mo_id UUID;
BEGIN

  -- Get Work Centers
  SELECT id INTO v_assembly_id FROM work_centers WHERE name = 'Assembly Line';
  SELECT id INTO v_paint_id FROM work_centers WHERE name = 'Paint Floor';

  -- Create Products
  INSERT INTO products (name, sku, current_stock) VALUES ('Wooden Table', 'PROD-TABLE', 0) RETURNING id INTO v_table_id;
  INSERT INTO products (name, sku, current_stock) VALUES ('Office Chair', 'PROD-CHAIR', 0) RETURNING id INTO v_chair_id;
  
  -- Components
  INSERT INTO products (name, sku, current_stock) VALUES ('Wooden Leg', 'COMP-LEG', 0) RETURNING id INTO v_legs_id;
  INSERT INTO products (name, sku, current_stock) VALUES ('Table Top', 'COMP-TOP', 0) RETURNING id INTO v_top_id;
  INSERT INTO products (name, sku, current_stock) VALUES ('Screw Pack', 'COMP-SCREW', 0) RETURNING id INTO v_screw_id;
  INSERT INTO products (name, sku, current_stock) VALUES ('Varnish', 'COMP-VARNISH', 0) RETURNING id INTO v_varnish_id;

  -- 3. Initial Stock Ledger (Starting Inventory for Components)
  -- 100 Legs, 20 Tops, 500 Screws, 10 Varnish
  INSERT INTO stock_ledger (product_id, quantity, transaction_type, reference_document) VALUES
  (v_legs_id, 100, 'in', '{"type": "initial_stock"}'),
  (v_top_id, 20, 'in', '{"type": "initial_stock"}'),
  (v_screw_id, 500, 'in', '{"type": "initial_stock"}'),
  (v_varnish_id, 10, 'in', '{"type": "initial_stock"}');

  -- 4. Create BOM for Wooden Table
  INSERT INTO bill_of_materials (name, product_id) VALUES ('Table Basic BOM', v_table_id) RETURNING id INTO v_bom_id;

  -- BOM Components
  INSERT INTO bom_components (bom_id, component_id, quantity) VALUES
  (v_bom_id, v_legs_id, 4),  -- 4 Legs
  (v_bom_id, v_top_id, 1),   -- 1 Top
  (v_bom_id, v_screw_id, 1), -- 1 Screw Pack
  (v_bom_id, v_varnish_id, 0.5); -- 0.5 Varnish

  -- BOM Operations
  INSERT INTO bom_operations (bom_id, work_center_id, description, duration_minutes, sequence) VALUES
  (v_bom_id, v_assembly_id, 'Assemble Legs and Top', 60, 1),
  (v_bom_id, v_paint_id, 'Apply Varnish', 30, 2),
  (v_bom_id, v_assembly_id, 'Final Packing', 20, 3);

  -- 5. Create Manufacturing Order (Planned)
  INSERT INTO manufacturing_orders (product_id, quantity, status, start_date) 
  VALUES (v_table_id, 2, 'planned', NOW()) 
  RETURNING id INTO v_mo_id;

  -- Create Work Orders for this MO (logic often handled by App, but seeding here for testing)
  -- Copying operations to Work Orders
  INSERT INTO work_orders (mo_id, work_center_id, description, planned_duration_minutes, status, sequence)
  VALUES 
  (v_mo_id, v_assembly_id, 'Assemble Legs and Top', 60, 'pending', 1),
  (v_mo_id, v_paint_id, 'Apply Varnish', 30, 'pending', 2),
  (v_mo_id, v_assembly_id, 'Final Packing', 20, 'pending', 3);

END $$;
