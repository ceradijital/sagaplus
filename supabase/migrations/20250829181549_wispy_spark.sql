/*
  # Ürün Çift Fiyat Sistemi

  1. Database Changes
    - `products` tablosunda `connection_type` kaldırılıyor
    - `monthly_price` yerine `wired_price` ve `wireless_price` ekleniyor
    - Her ürün için hem kablolu hem kablosuz fiyat olacak

  2. Package Products Simplification  
    - Zorunlu grup sistemi kaldırılıyor
    - Sadece basit ürün listesi kalıyor
    - Hesaplama ekranında manuel not alanı

  3. Security
    - RLS politikaları korunuyor
    - Mevcut indeksler güncelleniyor
*/

-- Önce yeni kolonları ekle
DO $$
BEGIN
  -- Kablolu fiyat kolonu ekle
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'products' AND column_name = 'wired_price'
  ) THEN
    ALTER TABLE products ADD COLUMN wired_price NUMERIC(10,2) DEFAULT 0.00;
  END IF;

  -- Kablosuz fiyat kolonu ekle  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'products' AND column_name = 'wireless_price'
  ) THEN
    ALTER TABLE products ADD COLUMN wireless_price NUMERIC(10,2) DEFAULT 0.00;
  END IF;
END $$;

-- Mevcut verileri güncelle - monthly_price'ı her iki fiyata kopyala
UPDATE products 
SET 
  wired_price = monthly_price,
  wireless_price = monthly_price * 1.2 -- Kablosuz %20 daha pahalı olsun
WHERE wired_price = 0;

-- Eski kolonları kaldır
DO $$
BEGIN
  -- connection_type kolonu kaldır
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'products' AND column_name = 'connection_type'
  ) THEN
    ALTER TABLE products DROP COLUMN connection_type;
  END IF;

  -- monthly_price kolonu kaldır
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'products' AND column_name = 'monthly_price'
  ) THEN
    ALTER TABLE products DROP COLUMN monthly_price;
  END IF;
END $$;

-- Package products tablosunu sadeleştir
DO $$
BEGIN
  -- required_group kaldır
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'package_products' AND column_name = 'required_group'
  ) THEN
    ALTER TABLE package_products DROP COLUMN required_group;
  END IF;

  -- minimum_quantity kaldır  
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'package_products' AND column_name = 'minimum_quantity'
  ) THEN
    ALTER TABLE package_products DROP COLUMN minimum_quantity;
  END IF;

  -- can_substitute kaldır
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'package_products' AND column_name = 'can_substitute'
  ) THEN
    ALTER TABLE package_products DROP COLUMN can_substitute;
  END IF;

  -- substitute_ratio kaldır
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'package_products' AND column_name = 'substitute_ratio'
  ) THEN
    ALTER TABLE package_products DROP COLUMN substitute_ratio;
  END IF;
END $$;

-- Eski indeksleri kaldır
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_products_connection_type') THEN
    DROP INDEX idx_products_connection_type;
  END IF;
END $$;

-- Yeni indeksler ekle
CREATE INDEX IF NOT EXISTS idx_products_wired_price ON products(wired_price);
CREATE INDEX IF NOT EXISTS idx_products_wireless_price ON products(wireless_price);