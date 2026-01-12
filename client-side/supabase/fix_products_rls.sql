-- Policy to allow authenticated users (Admins) to Insert/Update/Delete Products
-- Run this in your Supabase SQL Editor

-- 1. Enable RLS on the table (if not already enabled)
ALTER TABLE "public"."shop_products" ENABLE ROW LEVEL SECURITY;

-- 2. Create Policies for "authenticated" role (which the Admin login uses)

-- Allow INSERT
CREATE POLICY "Enable insert for authenticated users" 
ON "public"."shop_products" 
FOR INSERT 
TO authenticated 
WITH CHECK (true);

-- Allow UPDATE
CREATE POLICY "Enable update for authenticated users" 
ON "public"."shop_products" 
FOR UPDATE 
TO authenticated 
USING (true)
WITH CHECK (true);

-- Allow DELETE
CREATE POLICY "Enable delete for authenticated users" 
ON "public"."shop_products" 
FOR DELETE 
TO authenticated 
USING (true);

-- Allow SELECT (Read) for everyone (anon + authenticated)
-- (Assuming public shop needs to read products too)
CREATE POLICY "Enable read access for all users" 
ON "public"."shop_products" 
FOR SELECT 
TO public 
USING (true);
