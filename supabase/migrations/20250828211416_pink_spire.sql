/*
  # Ürün Yönetimi Sistemi

  1. New Tables
    - `products`
      - `id` (uuid, primary key)
      - `name` (text, ürün adı)
      - `description` (text, nullable, açıklama)
      - `type` (enum: 'main_package' | 'additional_product')
      - `connection_type` (enum: 'wired' | 'wireless')
      - `monthly_price` (decimal, aylık abonelik bedeli)
      - `is_active` (boolean, aktif/pasif durum)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on `products` table
    - Add policy for admin product management
    - Add policy for general product viewing

  3. Permissions
    - admin.products.manage: Ürün yönetimi tam yetkisi
    - products.view: Ürün görüntüleme yetkisi
    - products.calculate: Hesaplama modülü yetkisi
</*/

-- Create product type enums
CREATE TYPE product_type AS ENUM ('main_package', 'additional_product');
CREATE TYPE connection_type AS ENUM ('wired', 'wireless');

-- Create products table
CREATE TABLE IF NOT EXISTS products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  type product_type NOT NULL DEFAULT 'main_package',
  connection_type connection_type NOT NULL DEFAULT 'wired',
  monthly_price decimal(10,2) NOT NULL DEFAULT 0.00,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Admins can manage all products"
  ON products
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      JOIN roles r ON p.role_id = r.id
      JOIN role_permissions rp ON r.id = rp.role_id
      JOIN permissions perm ON rp.permission_id = perm.id
      WHERE p.id = auth.uid() 
      AND perm.code = 'admin.products.manage'
    )
  );

CREATE POLICY "Anyone can view active products"
  ON products
  FOR SELECT
  TO authenticated
  USING (is_active = true);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_products_type ON products(type);
CREATE INDEX IF NOT EXISTS idx_products_connection_type ON products(connection_type);
CREATE INDEX IF NOT EXISTS idx_products_is_active ON products(is_active);

-- Create trigger for updated_at
CREATE TRIGGER update_products_updated_at
  BEFORE UPDATE ON products
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Insert product permissions
INSERT INTO permissions (name, code, description, category) VALUES
  ('Ürün Yönetimi', 'admin.products.manage', 'Ürün ekleme, güncelleme ve silme yetkisi', 'Admin'),
  ('Ürün Görüntüleme', 'products.view', 'Ürün listesi görüntüleme yetkisi', 'Sales'),
  ('Fiyat Hesaplama', 'products.calculate', 'Ürün fiyat hesaplama modülü yetkisi', 'Sales')
ON CONFLICT (code) DO NOTHING;

-- Give admin role all product permissions
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM roles WHERE name = 'Super Admin') THEN
    -- Add all product permissions to Super Admin role
    INSERT INTO role_permissions (role_id, permission_id)
    SELECT r.id, p.id
    FROM roles r, permissions p
    WHERE r.name = 'Super Admin' 
    AND p.code IN ('admin.products.manage', 'products.view', 'products.calculate')
    ON CONFLICT (role_id, permission_id) DO NOTHING;
  END IF;
END $$;

-- Insert sample products
INSERT INTO products (name, description, type, connection_type, monthly_price) VALUES
  ('Temel İnternet Paketi', '25 Mbps fiber internet bağlantısı', 'main_package', 'wired', 89.90),
  ('Premium İnternet Paketi', '100 Mbps fiber internet bağlantısı', 'main_package', 'wired', 149.90),
  ('Ultra İnternet Paketi', '1000 Mbps fiber internet bağlantısı', 'main_package', 'wired', 299.90),
  ('Wi-Fi Modem', 'Kablosuz AC modem', 'additional_product', 'wireless', 25.00),
  ('Powerline Adaptör', 'Elektrik hattı üzerinden internet', 'additional_product', 'wired', 35.00),
  ('Mesh Sistem', 'Geniş alan Wi-Fi çözümü', 'additional_product', 'wireless', 75.00),
  ('VPN Paketi', 'Güvenli internet erişimi', 'additional_product', 'wireless', 19.90),
  ('Statik IP', 'Sabit IP adresi hizmeti', 'additional_product', 'wired', 29.90)
ON CONFLICT DO NOTHING;