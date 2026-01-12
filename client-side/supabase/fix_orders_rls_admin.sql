-- Allow Admins to View and Update Orders
-- Run this in Supabase SQL Editor

-- 1. Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Admins can view all orders" ON "public"."shop_orders";
DROP POLICY IF EXISTS "Admins can update orders" ON "public"."shop_orders";

-- 2. Policy to allow authenticated users who are in 'admin_profiles' to VIEW ALL orders
CREATE POLICY "Admins can view all orders" 
ON "public"."shop_orders" 
FOR SELECT 
TO authenticated 
USING (
  (auth.uid() = user_id) OR 
  (EXISTS (SELECT 1 FROM admin_profiles WHERE id = auth.uid() AND is_active = true))
);

-- 3. Allow Admins to UPDATE orders (to confirm, etc.)
CREATE POLICY "Admins can update orders" 
ON "public"."shop_orders" 
FOR UPDATE 
TO authenticated 
USING (
  EXISTS (SELECT 1 FROM admin_profiles WHERE id = auth.uid() AND is_active = true)
);
