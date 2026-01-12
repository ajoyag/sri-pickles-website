-- Fix Orders Tables and Stock Deduction Logic
-- Run this in Supabase SQL Editor

-- 1. Create 'shop_orders' table if not exists
CREATE TABLE IF NOT EXISTS "public"."shop_orders" (
    "id" uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    "user_id" uuid REFERENCES auth.users(id),
    "status" text DEFAULT 'pending',
    "total_amount" numeric DEFAULT 0,
    "subtotal" numeric DEFAULT 0,
    "gst" numeric DEFAULT 0,
    "shipping_cost" numeric DEFAULT 0,
    "discount" numeric DEFAULT 0,
    "promo_code" text,
    "shipping_address" jsonb,
    "billing_address" jsonb,
    "payment_method" text,
    "payment_id" text,
    "payment_status" text DEFAULT 'pending',
    "created_at" timestamptz DEFAULT now()
);

-- 2. Create 'shop_order_items' table if not exists
CREATE TABLE IF NOT EXISTS "public"."shop_order_items" (
    "id" uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    "order_id" uuid REFERENCES "public"."shop_orders"("id") ON DELETE CASCADE,
    "product_id" bigint REFERENCES "public"."shop_products"("id"), -- Assuming product_id is bigint based on usage
    "product_name" text,
    "variant_label" text,
    "quantity" integer DEFAULT 1,
    "price" numeric DEFAULT 0,
    "created_at" timestamptz DEFAULT now()
);

-- 3. Create 'shop_cart' table if not exists
CREATE TABLE IF NOT EXISTS "public"."shop_cart" (
    "id" uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    "user_id" uuid REFERENCES auth.users(id) ON DELETE CASCADE,
    "product_id" bigint REFERENCES "public"."shop_products"("id"),
    "quantity" integer DEFAULT 1,
    "variant_index" integer DEFAULT 0,
    "created_at" timestamptz DEFAULT now()
);

-- 4. Enable RLS for Orders and Cart
ALTER TABLE "public"."shop_orders" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."shop_order_items" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."shop_cart" ENABLE ROW LEVEL SECURITY;

-- 5. Policies for Orders (Users see own, Admin sees all)
-- (Simplifying: Allow Authenticated to Select/Insert Own)
CREATE POLICY "Users can create orders" ON "public"."shop_orders" FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can view own orders" ON "public"."shop_orders" FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- 6. RPC Function for Stock Deduction (Advanced JSONB manipulation)
CREATE OR REPLACE FUNCTION deduct_stock(p_product_id bigint, p_quantity int, p_variant_label text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- 1. Update global stock quantity
  UPDATE shop_products
  SET stock_quantity = GREATEST(0, stock_quantity - p_quantity)
  WHERE id = p_product_id;

  -- 2. Update specific variant stock inside JSONB array
  -- This requires rebuilding the array.
  -- Only if variants column exists and is not null.
  UPDATE shop_products
  SET variants = (
    SELECT jsonb_agg(
      CASE 
        -- Match variant label (cast to text to match)
        WHEN (elem->>'label')::text = p_variant_label THEN 
           jsonb_set(elem, '{stock}', to_jsonb(GREATEST(0, (COALESCE((elem->>'stock')::int, 0) - p_quantity))))
        ELSE elem 
      END
    )
    FROM jsonb_array_elements(variants) AS elem
  )
  WHERE id = p_product_id 
    AND variants IS NOT NULL 
    AND jsonb_typeof(variants) = 'array';
    
END;
$$;
