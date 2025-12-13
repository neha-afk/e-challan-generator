-- Create custom types
CREATE TYPE contact_type AS ENUM ('customer', 'vendor');
CREATE TYPE mo_status AS ENUM ('planned', 'in_progress', 'done', 'canceled');
CREATE TYPE wo_status AS ENUM ('pending', 'in_progress', 'completed');
CREATE TYPE transaction_type AS ENUM ('in', 'out');

-- 1. Profiles (Extends auth.users)
CREATE TABLE profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  role TEXT CHECK (role IN ('admin', 'user')) DEFAULT 'user',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Contacts (Customers and Vendors)
CREATE TABLE contacts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  type contact_type NOT NULL,
  email TEXT,
  phone TEXT,
  address TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Products
CREATE TABLE products (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  sku TEXT UNIQUE NOT NULL,
  description TEXT,
  current_stock NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Work Centers
CREATE TABLE work_centers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  hourly_cost NUMERIC DEFAULT 0,
  capacity NUMERIC DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Bills of Material (BOMs)
CREATE TABLE bill_of_materials (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. BOM Components
CREATE TABLE bom_components (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  bom_id UUID REFERENCES bill_of_materials(id) ON DELETE CASCADE,
  component_id UUID REFERENCES products(id) ON DELETE RESTRICT,
  quantity NUMERIC NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. BOM Operations
CREATE TABLE bom_operations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  bom_id UUID REFERENCES bill_of_materials(id) ON DELETE CASCADE,
  work_center_id UUID REFERENCES work_centers(id) ON DELETE RESTRICT,
  description TEXT,
  duration_minutes NUMERIC DEFAULT 0,
  sequence INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. Manufacturing Orders (MOs)
CREATE TABLE manufacturing_orders (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID REFERENCES products(id) ON DELETE RESTRICT,
  quantity NUMERIC NOT NULL,
  status mo_status DEFAULT 'planned',
  start_date TIMESTAMPTZ,
  end_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. Work Orders
CREATE TABLE work_orders (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  mo_id UUID REFERENCES manufacturing_orders(id) ON DELETE CASCADE,
  work_center_id UUID REFERENCES work_centers(id) ON DELETE RESTRICT,
  status wo_status DEFAULT 'pending',
  description TEXT,
  planned_duration_minutes NUMERIC,
  actual_duration_minutes NUMERIC DEFAULT 0,
  start_time TIMESTAMPTZ,
  end_time TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 10. Stock Ledger
CREATE TABLE stock_ledger (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  quantity NUMERIC NOT NULL,
  transaction_type transaction_type NOT NULL,
  reference_document JSONB, -- Stores { type: 'mo', id: '...' } or similar
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE work_centers ENABLE ROW LEVEL SECURITY;
ALTER TABLE bill_of_materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE bom_components ENABLE ROW LEVEL SECURITY;
ALTER TABLE bom_operations ENABLE ROW LEVEL SECURITY;
ALTER TABLE manufacturing_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE work_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_ledger ENABLE ROW LEVEL SECURITY;

-- Policies
-- 1. Read access for all authenticated users
CREATE POLICY "Authenticated users can view all data" ON profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can view all data" ON contacts FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can view all data" ON products FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can view all data" ON work_centers FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can view all data" ON bill_of_materials FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can view all data" ON bom_components FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can view all data" ON bom_operations FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can view all data" ON manufacturing_orders FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can view all data" ON work_orders FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can view all data" ON stock_ledger FOR SELECT TO authenticated USING (true);

-- 2. Modification access (Admin only for critical tables)
-- Helper function to check if user is admin
CREATE OR REPLACE FUNCTION is_admin() 
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() 
    AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Manufacturing Orders & BOMs: Admin only for modifications
CREATE POLICY "Admins can insert MOs" ON manufacturing_orders FOR INSERT TO authenticated WITH CHECK (is_admin());
CREATE POLICY "Admins can update MOs" ON manufacturing_orders FOR UPDATE TO authenticated USING (is_admin());
CREATE POLICY "Admins can delete MOs" ON manufacturing_orders FOR DELETE TO authenticated USING (is_admin());

CREATE POLICY "Admins can insert BOMs" ON bill_of_materials FOR INSERT TO authenticated WITH CHECK (is_admin());
CREATE POLICY "Admins can update BOMs" ON bill_of_materials FOR UPDATE TO authenticated USING (is_admin());
CREATE POLICY "Admins can delete BOMs" ON bill_of_materials FOR DELETE TO authenticated USING (is_admin());

-- Components and Operations follow BOM rules (Admin only)
CREATE POLICY "Admins can modify bom_components" ON bom_components FOR ALL TO authenticated USING (is_admin());
CREATE POLICY "Admins can modify bom_operations" ON bom_operations FOR ALL TO authenticated USING (is_admin());

-- General users might need valid permissions for other tables (e.g., Work Orders updates), 
-- but per requirements "only admins can modify manufacturing orders and BOMs". 
-- Implied others might be modifiable by users or system. 
-- For now, I'll leave other modification policies open to authenticated or restricted based on further needs.
-- Adding a safe default for other tables to allow authenticated users to Insert/Update for basic operations if needed,
-- or strictly following "Admin modify MO/BOM" and maybe restricting others too?
-- The prompt specifically restricted MO and BOMs to Admin. 
-- I will allow authenticated users to modify Contacts, Products, Work Centers, Work Orders (workers need to update status) for now.

CREATE POLICY "Authenticated can modify contacts" ON contacts FOR ALL TO authenticated USING (true);
CREATE POLICY "Authenticated can modify products" ON products FOR ALL TO authenticated USING (true);
CREATE POLICY "Authenticated can modify work_centers" ON work_centers FOR ALL TO authenticated USING (true);
CREATE POLICY "Authenticated can modify work_orders" ON work_orders FOR ALL TO authenticated USING (true);
-- Stock ledger should probably be system only or careful triggers, but allowing auth for now for transactions.
CREATE POLICY "Authenticated can insert stock_ledger" ON stock_ledger FOR INSERT TO authenticated WITH CHECK (true);

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_profiles_modtime BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_contacts_modtime BEFORE UPDATE ON contacts FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_products_modtime BEFORE UPDATE ON products FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_work_centers_modtime BEFORE UPDATE ON work_centers FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_bill_of_materials_modtime BEFORE UPDATE ON bill_of_materials FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_bom_components_modtime BEFORE UPDATE ON bom_components FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_bom_operations_modtime BEFORE UPDATE ON bom_operations FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_manufacturing_orders_modtime BEFORE UPDATE ON manufacturing_orders FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_work_orders_modtime BEFORE UPDATE ON work_orders FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
