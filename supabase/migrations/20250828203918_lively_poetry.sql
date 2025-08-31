/*
  # HR sistemi yetki düzeltmeleri

  1. Yeni İK yetkilerini ekleme
    - hr.requests.manage (İK yöneticileri için)
    - hr.requests.approve_sales (Satış müdürleri için)
    - hr.requests.view (Genel görüntüleme yetkisi)

  2. Super admin'e tüm HR yetkilerini verme
  3. HR talep görüntüleme permissions düzeltme
*/

-- HR permissions ekle
INSERT INTO permissions (name, code, description, category) VALUES
  ('İK Talepleri Yönet', 'hr.requests.manage', 'Tüm HR taleplerini yönetebilir', 'İnsan Kaynakları'),
  ('Satış Onayı Ver', 'hr.requests.approve_sales', 'Kendi ekibinin HR taleplerini onaylayabilir', 'İnsan Kaynakları'),
  ('İK Talepleri Görüntüle', 'hr.requests.view', 'HR taleplerini görüntüleyebilir', 'İnsan Kaynakları')
ON CONFLICT (code) DO NOTHING;

-- Super Admin rolüne HR yetkilerini ekle
INSERT INTO role_permissions (role_id, permission_id)
SELECT 
  r.id as role_id,
  p.id as permission_id
FROM roles r, permissions p
WHERE r.name = 'Super Admin' 
AND p.code IN ('hr.requests.manage', 'hr.requests.approve_sales', 'hr.requests.view')
ON CONFLICT (role_id, permission_id) DO NOTHING;