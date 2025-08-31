/*
  # Paket Sistemi - Kale Alarm X

  1. New Tables
    - `packages`
      - `id` (uuid, primary key)
      - `name` (text, paket adı)
      - `description` (text, paket açıklaması)
      - `is_active` (boolean, aktif durumu)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
    
    - `package_products`
      - `id` (uuid, primary key)
      - `package_id` (uuid, foreign key)
      - `name` (text, ürün adı)
      - `description` (text, ürün açıklaması)
      - `price` (numeric, ürün fiyatı)
      - `is_required` (boolean, zorunlu mu)
      - `is_active` (boolean, aktif durumu)
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on both tables
    - Add policies for authenticated users
    
  3. Sample Data
    - Kale Alarm X paketi
    - 7 adet paket ürünü (3 zorunlu, 4 opsiyonel)
*/

-- Packages table
CREATE TABLE IF NOT EXISTS packages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Package products
CREATE TABLE IF NOT EXISTS package_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  package_id uuid REFERENCES packages(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  price numeric(10,2) DEFAULT 0.00,
  is_required boolean DEFAULT false,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE package_products ENABLE ROW LEVEL SECURITY;

-- RLS Policies for packages
CREATE POLICY "Anyone can view active packages"
  ON packages
  FOR SELECT
  TO authenticated
  USING (is_active = true);

CREATE POLICY "Admins can manage all packages"
  ON packages
  FOR ALL
  TO authenticated
  USING (has_permission('admin.products.manage'::text))
  WITH CHECK (has_permission('admin.products.manage'::text));

-- RLS Policies for package_products  
CREATE POLICY "Anyone can view active package products"
  ON package_products
  FOR SELECT
  TO authenticated
  USING (is_active = true);

CREATE POLICY "Admins can manage all package products"
  ON package_products
  FOR ALL
  TO authenticated
  USING (has_permission('admin.products.manage'::text))
  WITH CHECK (has_permission('admin.products.manage'::text));

-- Update triggers
CREATE TRIGGER update_packages_updated_at
  BEFORE UPDATE ON packages
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Sample data
INSERT INTO packages (name, description) VALUES
('Kale Alarm X', 'Profesyonel güvenlik alarm sistemi paketi - modüler yapı ile özelleştirilebilir');

-- Sample package products
INSERT INTO package_products (package_id, name, description, price, is_required) VALUES
((SELECT id FROM packages WHERE name = 'Kale Alarm X'), 'Ana Kontrol Paneli', 'Merkezi kontrol ünitesi - sistem beyni', 1500.00, true),
((SELECT id FROM packages WHERE name = 'Kale Alarm X'), 'Hareket Sensörü (PIR)', 'Passive infrared hareket algılayıcı', 150.00, true),
((SELECT id FROM packages WHERE name = 'Kale Alarm X'), 'Kapı/Pencere Sensörü', 'Manyetik kontak sensörü', 75.00, true),
((SELECT id FROM packages WHERE name = 'Kale Alarm X'), 'Dış Siren', 'Harici güvenlik uyarı sireni', 200.00, false),
((SELECT id FROM packages WHERE name = 'Kale Alarm X'), 'İç Siren', 'Dahili sesli uyarı sistemi', 120.00, false),
((SELECT id FROM packages WHERE name = 'Kale Alarm X'), 'Uzaktan Kumanda', 'Kablosuz kontrol kumandası', 80.00, false),
((SELECT id FROM packages WHERE name = 'Kale Alarm X'), 'GSM Modülü', 'Mobil iletişim ve SMS bildirimi', 300.00, false);