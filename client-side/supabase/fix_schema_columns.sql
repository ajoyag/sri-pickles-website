-- Add potentially missing columns to shop_products table
-- Run this in Supabase SQL Editor

-- 1. Add 'price' column if missing
ALTER TABLE "public"."shop_products" ADD COLUMN IF NOT EXISTS "price" numeric DEFAULT 0;

-- 2. Add 'stock_quantity' if missing
ALTER TABLE "public"."shop_products" ADD COLUMN IF NOT EXISTS "stock_quantity" integer DEFAULT 0;

-- 3. Add 'variants' if missing (using JSONB)
ALTER TABLE "public"."shop_products" ADD COLUMN IF NOT EXISTS "variants" jsonb DEFAULT '[]';

-- 4. Add 'active' if missing
ALTER TABLE "public"."shop_products" ADD COLUMN IF NOT EXISTS "active" boolean DEFAULT true;

-- 5. Add 'image_url' if missing (sometimes just 'image')
ALTER TABLE "public"."shop_products" ADD COLUMN IF NOT EXISTS "image_url" text;

-- 6. Refresh Schema Cache
NOTIFY pgrst, 'reload config';
