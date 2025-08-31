/*
  # Kale Alarm X esnek zorunlu ürün sistemi

  1. Yeni Kolonlar
    - `package_products` tablosunda `required_group` kolonu eklendi
    - `minimum_quantity` kolonu eklendi (bir gruptan minimum kaç adet gerekli)
    - `can_substitute` kolonu eklendi (başka ürünle değiştirilebilir mi)
    - `substitute_ratio` kolonu eklendi (1 adet bu ürün = kaç adet başka ürün)

  2. Güncellenen Yapı
    - Zorunlu ürünler artık gruplara ayrılabilir
    - Her grup içinde alternatifler olabilir
    - Esneklik sağlanır (örn: A ürünü yerine 2 adet B ürünü)

  3. Örnek Veri
    - Güvenlik sensörleri grubu
    - Kontrol paneli grubu  
    - Alternatif ürünler
*/

-- Yeni kolonlar ekle
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'package_products' AND column_name = 'required_group'
  ) THEN
    ALTER TABLE package_products ADD COLUMN required_group text;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'package_products' AND column_name = 'minimum_quantity'
  ) THEN
    ALTER TABLE package_products ADD COLUMN minimum_quantity integer DEFAULT 1;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'package_products' AND column_name = 'can_substitute'
  ) THEN
    ALTER TABLE package_products ADD COLUMN can_substitute boolean DEFAULT false;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'package_products' AND column_name = 'substitute_ratio'
  ) THEN
    ALTER TABLE package_products ADD COLUMN substitute_ratio numeric(3,1) DEFAULT 1.0;
  END IF;
END $$;

-- Eski is_required kolonunu güncelle - artık required_group varsa zorunlu
DO $$
BEGIN
  UPDATE package_products 
  SET required_group = CASE 
    WHEN is_required THEN 'essential'
    ELSE NULL 
  END
  WHERE required_group IS NULL;
END $$;