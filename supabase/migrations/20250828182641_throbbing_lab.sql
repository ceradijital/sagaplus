/*
  # Authentication and Authorization Schema

  1. New Tables
    - `profiles`
      - `id` (uuid, primary key, references auth.users)
      - `email` (text, unique)
      - `full_name` (text, nullable)
      - `role_id` (uuid, foreign key to roles)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

    - `roles`
      - `id` (uuid, primary key)
      - `name` (text, unique)
      - `description` (text, nullable)
      - `is_active` (boolean, default true)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

    - `permissions`
      - `id` (uuid, primary key)
      - `name` (text)
      - `code` (text, unique)
      - `description` (text, nullable)
      - `category` (text)
      - `created_at` (timestamp)

    - `role_permissions`
      - `id` (uuid, primary key)
      - `role_id` (uuid, foreign key to roles)
      - `permission_id` (uuid, foreign key to permissions)
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users
    - Create admin policies for role management

  3. Initial Data
    - Create default permissions for sales operations
    - Create super admin role
    - Insert sample permissions
*/

-- Create roles table
CREATE TABLE IF NOT EXISTS roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  description text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create permissions table
CREATE TABLE IF NOT EXISTS permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  code text UNIQUE NOT NULL,
  description text,
  category text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Create role_permissions junction table
CREATE TABLE IF NOT EXISTS role_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role_id uuid REFERENCES roles(id) ON DELETE CASCADE,
  permission_id uuid REFERENCES permissions(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(role_id, permission_id)
);

-- Create profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text UNIQUE NOT NULL,
  full_name text,
  role_id uuid REFERENCES roles(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Create policies for roles
CREATE POLICY "Anyone can read roles"
  ON roles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Only admins can manage roles"
  ON roles FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      JOIN role_permissions rp ON p.role_id = rp.role_id
      JOIN permissions perm ON rp.permission_id = perm.id
      WHERE p.id = auth.uid() AND perm.code = 'admin.roles.manage'
    )
  );

-- Create policies for permissions
CREATE POLICY "Anyone can read permissions"
  ON permissions FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Only admins can manage permissions"
  ON permissions FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      JOIN role_permissions rp ON p.role_id = rp.role_id
      JOIN permissions perm ON rp.permission_id = perm.id
      WHERE p.id = auth.uid() AND perm.code = 'admin.permissions.manage'
    )
  );

-- Create policies for role_permissions
CREATE POLICY "Anyone can read role_permissions"
  ON role_permissions FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Only admins can manage role_permissions"
  ON role_permissions FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      JOIN role_permissions rp ON p.role_id = rp.role_id
      JOIN permissions perm ON rp.permission_id = perm.id
      WHERE p.id = auth.uid() AND perm.code = 'admin.roles.manage'
    )
  );

-- Create policies for profiles
CREATE POLICY "Users can read own profile"
  ON profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Admins can read all profiles"
  ON profiles FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      JOIN role_permissions rp ON p.role_id = rp.role_id
      JOIN permissions perm ON rp.permission_id = perm.id
      WHERE p.id = auth.uid() AND perm.code = 'admin.users.manage'
    )
  );

CREATE POLICY "Admins can manage all profiles"
  ON profiles FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      JOIN role_permissions rp ON p.role_id = rp.role_id
      JOIN permissions perm ON rp.permission_id = perm.id
      WHERE p.id = auth.uid() AND perm.code = 'admin.users.manage'
    )
  );

-- Insert default permissions for sales operations
INSERT INTO permissions (name, code, description, category) VALUES
-- Admin permissions
('Role Yönetimi', 'admin.roles.manage', 'Roller oluşturma, düzenleme ve silme', 'Admin'),
('Kullanıcı Yönetimi', 'admin.users.manage', 'Kullanıcıları yönetme ve rol atama', 'Admin'),
('Yetki Yönetimi', 'admin.permissions.manage', 'Yetkileri yönetme', 'Admin'),

-- Sales permissions
('Müşteri Görüntüleme', 'sales.customers.view', 'Müşteri listesini görüntüleme', 'Satış'),
('Müşteri Ekleme', 'sales.customers.create', 'Yeni müşteri ekleme', 'Satış'),
('Müşteri Düzenleme', 'sales.customers.edit', 'Müşteri bilgilerini düzenleme', 'Satış'),
('Müşteri Silme', 'sales.customers.delete', 'Müşteri silme', 'Satış'),

-- Order permissions
('Sipariş Görüntüleme', 'orders.view', 'Siparişleri görüntüleme', 'Sipariş'),
('Sipariş Oluşturma', 'orders.create', 'Yeni sipariş oluşturma', 'Sipariş'),
('Sipariş Düzenleme', 'orders.edit', 'Sipariş bilgilerini düzenleme', 'Sipariş'),
('Sipariş İptal', 'orders.cancel', 'Sipariş iptal etme', 'Sipariş'),

-- Report permissions
('Raporları Görüntüleme', 'reports.view', 'Satış raporlarını görüntüleme', 'Rapor'),
('Gelişmiş Raporlar', 'reports.advanced', 'Detaylı raporlara erişim', 'Rapor'),

-- Settings permissions
('Ayarları Görüntüleme', 'settings.view', 'Sistem ayarlarını görüntüleme', 'Ayarlar'),
('Ayarları Düzenleme', 'settings.edit', 'Sistem ayarlarını düzenleme', 'Ayarlar');

-- Create default roles
INSERT INTO roles (name, description) VALUES
('Super Admin', 'Tüm yetkilere sahip yönetici rolü'),
('Satış Müdürü', 'Satış ekibini yöneten müdür rolü'),
('Satış Temsilcisi', 'Saha satış temsilcisi rolü'),
('Satış Uzmanı', 'Deneyimli satış uzmanı rolü');

-- Assign all permissions to Super Admin role
INSERT INTO role_permissions (role_id, permission_id)
SELECT 
  (SELECT id FROM roles WHERE name = 'Super Admin'),
  id
FROM permissions;

-- Create function to handle new user registration
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'full_name');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new user registration
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'on_auth_user_created'
  ) THEN
    CREATE TRIGGER on_auth_user_created
      AFTER INSERT ON auth.users
      FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
  END IF;
END $$;

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER update_roles_updated_at BEFORE UPDATE ON roles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();