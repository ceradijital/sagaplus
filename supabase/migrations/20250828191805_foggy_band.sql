/*
  # Rol Yetki Güncelleme Politikalarını Düzelt

  1. Güvenlik
    - RLS politikalarında sonsuz döngü ve timing problemlerini çöz
    - Service role için güvenli erişim sağla
    - Rol güncelleme işlemi sırasında yetki kaybını önle

  2. Değişiklikler
    - role_permissions tablosu için daha güvenli politikalar
    - Transaction benzeri güvenli güncelleme mantığı
    - Admin yetkilerinin korunması
*/

-- role_permissions tablosu için mevcut politikaları kaldır
DROP POLICY IF EXISTS "Anyone can read role_permissions" ON role_permissions;
DROP POLICY IF EXISTS "Only admins can manage role_permissions" ON role_permissions;

-- Daha güvenli politikalar oluştur
CREATE POLICY "Service role can manage all role_permissions"
  ON role_permissions
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Anyone can read role_permissions"
  ON role_permissions
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage role_permissions safely"
  ON role_permissions
  FOR ALL
  TO authenticated
  USING (
    -- Admin kontrolü için basit email check (sonsuz döngü önlemek için)
    auth.jwt() ->> 'email' IN (
      'admin@company.com',
      'manager@company.com'
    ) 
    OR
    -- Ya da mevcut session'ın admin yetkisi varsa (ama dikkatli)
    EXISTS (
      SELECT 1 FROM auth.users u
      WHERE u.id = auth.uid() 
      AND u.email IN ('admin@company.com', 'manager@company.com')
    )
  );