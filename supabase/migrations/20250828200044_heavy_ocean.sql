/*
  # Müşteri Yönetimi Tablosu

  1. New Tables
    - `customers`
      - `id` (uuid, primary key)
      - `name` (text, müşteri adı)
      - `email` (text, email adresi)
      - `phone` (text, telefon)
      - `address` (text, adres)
      - `type` (customer_type enum: individual/corporate)
      - `tax_number` (text, kurumsal müşteriler için vergi no)
      - `assigned_staff_id` (uuid, hangi personele atandığı)
      - `city_id` (uuid, şehir referansı)
      - `notes` (text, notlar)
      - `is_active` (boolean, aktif/pasif)
      - `created_at`, `updated_at` (timestamps)

  2. Security
    - Enable RLS on `customers` table
    - Personeller sadece kendi müşterilerini görebilir
    - Adminler tüm müşterileri görebilir
    - Service role tam erişim

  3. Enums
    - `customer_type`: individual, corporate
*/

-- Create customer type enum
DO $$ BEGIN
  CREATE TYPE customer_type AS ENUM ('individual', 'corporate');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Create customers table
CREATE TABLE IF NOT EXISTS customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text,
  phone text,
  address text,
  type customer_type NOT NULL DEFAULT 'individual',
  tax_number text,
  assigned_staff_id uuid,
  city_id uuid,
  notes text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Add foreign key constraints
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'customers_assigned_staff_id_fkey'
  ) THEN
    ALTER TABLE customers 
    ADD CONSTRAINT customers_assigned_staff_id_fkey 
    FOREIGN KEY (assigned_staff_id) REFERENCES profiles(id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'customers_city_id_fkey'
  ) THEN
    ALTER TABLE customers 
    ADD CONSTRAINT customers_city_id_fkey 
    FOREIGN KEY (city_id) REFERENCES cities(id);
  END IF;
END $$;

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.triggers 
    WHERE trigger_name = 'update_customers_updated_at'
  ) THEN
    CREATE TRIGGER update_customers_updated_at 
    BEFORE UPDATE ON customers 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

-- Enable RLS
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Admin users can manage all customers
CREATE POLICY "Admin users can manage all customers"
  ON customers
  FOR ALL
  TO authenticated
  USING (
    ((current_setting('request.jwt.claims', true)::json->>'email')::text) 
    = ANY (ARRAY['admin@company.com'::text, 'manager@company.com'::text])
  )
  WITH CHECK (
    ((current_setting('request.jwt.claims', true)::json->>'email')::text) 
    = ANY (ARRAY['admin@company.com'::text, 'manager@company.com'::text])
  );

-- Staff can only see their assigned customers
CREATE POLICY "Staff can view assigned customers"
  ON customers
  FOR SELECT
  TO authenticated
  USING (assigned_staff_id = auth.uid());

-- Staff can update their assigned customers
CREATE POLICY "Staff can update assigned customers"
  ON customers
  FOR UPDATE
  TO authenticated
  USING (assigned_staff_id = auth.uid())
  WITH CHECK (assigned_staff_id = auth.uid());

-- Staff can create customers assigned to themselves
CREATE POLICY "Staff can create customers"
  ON customers
  FOR INSERT
  TO authenticated
  WITH CHECK (assigned_staff_id = auth.uid());

-- Service role full access
CREATE POLICY "Service role full access on customers"
  ON customers
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);