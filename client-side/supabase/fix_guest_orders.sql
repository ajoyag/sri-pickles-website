-- Enable Guest Checkout (Allow Anon Insert)
-- Run this in Supabase SQL Editor

-- 1. Orders Table: Allow Anon Insert
CREATE POLICY "Enable insert for everyone" 
ON "public"."shop_orders" 
FOR INSERT 
TO public 
WITH CHECK (true);

-- 2. Order Items: Allow Anon Insert
CREATE POLICY "Enable insert items for everyone" 
ON "public"."shop_order_items" 
FOR INSERT 
TO public 
WITH CHECK (true);

-- 3. Cart: Allow Anon Insert/Select/Update/Delete (for Guest Cart Persistence if we move to DB-only)
-- Currently Guest uses localStorage, so strictly speaking DB cart is for Auth users.
-- But usually good to allow public access if we want to sync guest cart later.
CREATE POLICY "Enable all for public cart" 
ON "public"."shop_cart" 
FOR ALL 
TO public 
USING (true)
WITH CHECK (true);
