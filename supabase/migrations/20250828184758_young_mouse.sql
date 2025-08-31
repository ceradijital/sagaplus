/*
  # Personel Yönetim Sistemi

  1. Yeni Tablolar
    - `cities` - Şehir bilgileri
    - `teams` - Ekip bilgileri (şehir bazlı)
    - `staff` - Personel bilgileri (ekip ve yönetici ataması ile)
  
  2. Güncellemeler
    - `profiles` tablosuna `team_id` eklendi
    - Otomatik personel kaydı için trigger fonksiyonu
  
  3. Güvenlik
    - Tüm tablolarda RLS aktif
    - Admin ve yönetici yetkileri için politikalar
    - Personelin kendi bilgilerini görme yetkisi
*/

-- Cities table
CREATE TABLE IF NOT EXISTS cities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  code text UNIQUE NOT NULL,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Teams table
CREATE TABLE IF NOT EXISTS teams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  city_id uuid REFERENCES cities(id),
  manager_id uuid REFERENCES profiles(id),
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Staff table
CREATE TABLE IF NOT EXISTS staff (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  employee_code text UNIQUE NOT NULL,
  phone text,
  hire_date date DEFAULT CURRENT_DATE,
  team_id uuid REFERENCES teams(id),
  is_active boolean DEFAULT true,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Add team_id to profiles
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'team_id'
  ) THEN
    ALTER TABLE profiles ADD COLUMN team_id uuid REFERENCES teams(id);
  END IF;
END $$;

-- Update the handle_new_user function to create staff record
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
BEGIN
  -- Create profile
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'full_name', new.email)
  );
  
  -- Create staff record with auto-generated employee code
  INSERT INTO public.staff (profile_id, employee_code)
  VALUES (
    new.id,
    'EMP' || TO_CHAR(EXTRACT(EPOCH FROM NOW())::bigint, 'FM999999999')
  );
  
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Enable RLS
ALTER TABLE cities ENABLE ROW LEVEL SECURITY;
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff ENABLE ROW LEVEL SECURITY;

-- Cities policies
CREATE POLICY "Anyone can read cities"
  ON cities FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Only admins can manage cities"
  ON cities FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      JOIN role_permissions rp ON p.role_id = rp.role_id
      JOIN permissions perm ON rp.permission_id = perm.id
      WHERE p.id = auth.uid() AND perm.code = 'admin.cities.manage'
    )
  );

-- Teams policies
CREATE POLICY "Anyone can read teams"
  ON teams FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage all teams"
  ON teams FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      JOIN role_permissions rp ON p.role_id = rp.role_id
      JOIN permissions perm ON rp.permission_id = perm.id
      WHERE p.id = auth.uid() AND perm.code = 'admin.teams.manage'
    )
  );

CREATE POLICY "Team managers can update their team"
  ON teams FOR UPDATE
  TO authenticated
  USING (auth.uid() = manager_id);

-- Staff policies
CREATE POLICY "Users can read own staff record"
  ON staff FOR SELECT
  TO authenticated
  USING (profile_id = auth.uid());

CREATE POLICY "Admins can read all staff"
  ON staff FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      JOIN role_permissions rp ON p.role_id = rp.role_id
      JOIN permissions perm ON rp.permission_id = perm.id
      WHERE p.id = auth.uid() AND perm.code = 'admin.staff.manage'
    )
  );

CREATE POLICY "Admins can manage all staff"
  ON staff FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      JOIN role_permissions rp ON p.role_id = rp.role_id
      JOIN permissions perm ON rp.permission_id = perm.id
      WHERE p.id = auth.uid() AND perm.code = 'admin.staff.manage'
    )
  );

CREATE POLICY "Team managers can read their team staff"
  ON staff FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM teams t
      WHERE t.id = staff.team_id AND t.manager_id = auth.uid()
    )
  );

-- Update triggers
CREATE TRIGGER update_cities_updated_at
  BEFORE UPDATE ON cities
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_teams_updated_at
  BEFORE UPDATE ON teams
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_staff_updated_at
  BEFORE UPDATE ON staff
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert sample cities
INSERT INTO cities (name, code) VALUES
  ('İstanbul', 'IST'),
  ('Ankara', 'ANK'),
  ('İzmir', 'IZM'),
  ('Bursa', 'BUR'),
  ('Antalya', 'ANT')
ON CONFLICT (code) DO NOTHING;

-- Insert sample teams (will be populated after first admin user is created)

-- Add new permissions for staff management
INSERT INTO permissions (name, code, description, category) VALUES
  ('Şehir Yönetimi', 'admin.cities.manage', 'Şehirleri yönetme yetkisi', 'Yönetim'),
  ('Ekip Yönetimi', 'admin.teams.manage', 'Ekipleri yönetme yetkisi', 'Yönetim'),
  ('Personel Yönetimi', 'admin.staff.manage', 'Personelleri yönetme yetkisi', 'Yönetim'),
  ('Personel Görüntüleme', 'staff.view', 'Personel listesini görüntüleme', 'Personel'),
  ('Kendi Ekip Yönetimi', 'team.manage', 'Kendi ekibini yönetme yetkisi', 'Ekip')
ON CONFLICT (code) DO NOTHING;