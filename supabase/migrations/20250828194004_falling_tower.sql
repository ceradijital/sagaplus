/*
  # Role permissions kaydetme hatalarını düzelt
  
  1. RLS Politika Düzeltmeleri
    - role_permissions tablosu için daha güvenli politikalar
    - Service role için tam erişim
    - Admin kullanıcılar için güvenli operasyonlar
  
  2. Güvenlik İyileştirmeleri
    - Sonsuz döngü problemi çözüldü
    - Daha basit admin kontrolü
*/

-- Önce problematik politikaları kaldıralım
DROP POLICY IF EXISTS "Admins can manage role_permissions" ON role_permissions;
DROP POLICY IF EXISTS "Admins can manage role_permissions safely" ON role_permissions;
DROP POLICY IF EXISTS "Anyone can read role_permissions" ON role_permissions;
DROP POLICY IF EXISTS "Service role can manage all role_permissions" ON role_permissions;

-- Yeni güvenli politikalar ekleyelim
CREATE POLICY "Service role full access"
  ON role_permissions
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Admin users can manage role permissions"
  ON role_permissions
  FOR ALL
  TO authenticated
  USING (
    auth.jwt() ->> 'email' IN (
      'admin@company.com',
      'manager@company.com'
    )
  )
  WITH CHECK (
    auth.jwt() ->> 'email' IN (
      'admin@company.com',
      'manager@company.com'
    )
  );

CREATE POLICY "Users can read role permissions"
  ON role_permissions
  FOR SELECT
  TO authenticated
  USING (true);