-- =====================================================
-- Sri Pickles Database Setup Script
-- =====================================================
-- This script creates all necessary tables, security policies,
-- and indexes for the e-commerce platform.
-- Run this in Supabase SQL Editor (one-time setup)
-- =====================================================

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- 1. PRODUCTS TABLE
-- =====================================================
-- Stores the product catalog (visible to all customers)
CREATE TABLE IF NOT EXISTS products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    category VARCHAR(50) NOT NULL, -- 'Veg' or 'Non Veg'
    description TEXT,
    image_url TEXT,
    variants JSONB NOT NULL, -- Array of {label, weight, price}
    tag VARCHAR(50), -- 'Veg', 'Non Veg', 'Podi'
    rating DECIMAL(2,1) DEFAULT 4.5, -- Rating out of 5
    active BOOLEAN DEFAULT true, -- Show/hide from customer site
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for faster category filtering
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
CREATE INDEX IF NOT EXISTS idx_products_active ON products(active);

-- =====================================================
-- 2. PROFILES TABLE
-- =====================================================
-- Extends Supabase auth.users with additional customer info
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    name VARCHAR(255),
    phone VARCHAR(20),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 3. ADDRESSES TABLE
-- =====================================================
-- Customer shipping addresses
CREATE TABLE IF NOT EXISTS addresses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    address TEXT NOT NULL,
    city VARCHAR(100) NOT NULL,
    state VARCHAR(100) NOT NULL,
    pincode VARCHAR(10) NOT NULL,
    is_default BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_addresses_user_id ON addresses(user_id);

-- =====================================================
-- 4. ORDERS TABLE
-- =====================================================
-- Order records
CREATE TABLE IF NOT EXISTS orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    order_number VARCHAR(50) UNIQUE NOT NULL, -- e.g., #ACH-2024-1234
    status VARCHAR(50) DEFAULT 'pending', -- pending, processing, shipped, delivered, cancelled
    total_amount DECIMAL(10,2) NOT NULL,
    subtotal DECIMAL(10,2) NOT NULL,
    gst DECIMAL(10,2) DEFAULT 0,
    shipping_cost DECIMAL(10,2) DEFAULT 50,
    discount DECIMAL(10,2) DEFAULT 0, -- Promotional discount
    promo_code VARCHAR(50), -- Promo code used
    shipping_address JSONB NOT NULL, -- Full address as JSON
    billing_address JSONB, -- Billing address as JSON
    payment_method VARCHAR(50), -- 'Razorpay', 'In-App Payment', 'Pay When Confirming Order'
    payment_id VARCHAR(255), -- Razorpay payment ID or transaction reference
    payment_status VARCHAR(50) DEFAULT 'pending', -- pending, completed, failed
    notes TEXT, -- Admin notes
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for orders
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_order_number ON orders(order_number);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at DESC);

-- Function to generate order number
CREATE OR REPLACE FUNCTION generate_order_number()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.order_number IS NULL THEN
        NEW.order_number := '#ACH-' || TO_CHAR(NOW(), 'YYYY') || '-' || LPAD(EXTRACT(EPOCH FROM NOW())::BIGINT % 10000::BIGINT, 4, '0');
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-generate order number
DROP TRIGGER IF EXISTS trigger_generate_order_number ON orders;
CREATE TRIGGER trigger_generate_order_number
    BEFORE INSERT ON orders
    FOR EACH ROW
    EXECUTE FUNCTION generate_order_number();

-- =====================================================
-- 5. ORDER ITEMS TABLE
-- =====================================================
-- Individual items in each order
CREATE TABLE IF NOT EXISTS order_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id) ON DELETE SET NULL,
    product_name VARCHAR(255) NOT NULL, -- Snapshot of product name
    variant_label VARCHAR(50) NOT NULL, -- e.g., "250 g", "500 g"
    quantity INTEGER NOT NULL DEFAULT 1,
    price DECIMAL(10,2) NOT NULL, -- Price per unit at time of order
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_product_id ON order_items(product_id);

-- =====================================================
-- 6. CART TABLE (Optional - can use localStorage instead)
-- =====================================================
-- Shopping cart items (optional, for logged-in users)
CREATE TABLE IF NOT EXISTS cart (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    variant_index INTEGER NOT NULL DEFAULT 0,
    quantity INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, product_id, variant_index) -- One cart entry per product variant per user
);

CREATE INDEX IF NOT EXISTS idx_cart_user_id ON cart(user_id);

-- =====================================================
-- 7. PROMO CODES TABLE
-- =====================================================
-- Stores promotional codes and discounts
CREATE TABLE IF NOT EXISTS promo_codes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL, -- e.g. "New Year Sale"
    code VARCHAR(50) UNIQUE NOT NULL, -- e.g. "NY2024"
    refer VARCHAR(255), -- Optional reference or person name
    discount_percent NUMERIC NOT NULL, -- e.g. 10 for 10%
    valid_from TIMESTAMPTZ NOT NULL, -- e.g. 2024-01-01T00:00:00Z
    valid_through TIMESTAMPTZ NOT NULL, -- e.g. 2024-12-31T23:59:59Z
    active BOOLEAN DEFAULT true, -- Show/hide from customer site
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 8. ORDER STATUS HISTORY TABLE (Optional)
-- =====================================================
-- Track order status changes over time
CREATE TABLE IF NOT EXISTS order_status_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    status VARCHAR(50) NOT NULL,
    notes TEXT,
    changed_by UUID REFERENCES profiles(id), -- Admin who changed status
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_order_status_history_order_id ON order_status_history(order_id);

-- Trigger to log status changes
CREATE OR REPLACE FUNCTION log_order_status_change()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.status IS DISTINCT FROM NEW.status THEN
        INSERT INTO order_status_history (order_id, status, notes, changed_by)
        VALUES (NEW.id, NEW.status, NEW.notes, auth.uid());
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_log_order_status ON orders;
CREATE TRIGGER trigger_log_order_status
    AFTER UPDATE ON orders
    FOR EACH ROW
    EXECUTE FUNCTION log_order_status_change();

-- =====================================================
-- 9. UPDATE TIMESTAMP TRIGGERS
-- =====================================================
-- Automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to all tables with updated_at
DROP TRIGGER IF EXISTS update_products_updated_at ON products;
CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON products
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_addresses_updated_at ON addresses;
CREATE TRIGGER update_addresses_updated_at BEFORE UPDATE ON addresses
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_orders_updated_at ON orders;
CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON orders
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_cart_updated_at ON cart;
CREATE TRIGGER update_cart_updated_at BEFORE UPDATE ON cart
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_promo_codes_updated_at ON promo_codes;
CREATE TRIGGER update_promo_codes_updated_at BEFORE UPDATE ON promo_codes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 10. ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE cart ENABLE ROW LEVEL SECURITY;
ALTER TABLE promo_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_status_history ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- PRODUCTS POLICIES
-- =====================================================
-- Everyone can read active products
DROP POLICY IF EXISTS "Products are viewable by everyone" ON products;
CREATE POLICY "Products are viewable by everyone"
    ON products FOR SELECT
    USING (active = true);

-- Service role (admin) can do everything with products
DROP POLICY IF EXISTS "Service role can manage products" ON products;
CREATE POLICY "Service role can manage products"
    ON products FOR ALL
    USING (auth.role() = 'service_role');

-- =====================================================
-- PROFILES POLICIES
-- =====================================================
-- Users can read their own profile
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
CREATE POLICY "Users can view own profile"
    ON profiles FOR SELECT
    USING (auth.uid() = id);

-- Users can update their own profile
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile"
    ON profiles FOR UPDATE
    USING (auth.uid() = id);

-- Users can insert their own profile
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
CREATE POLICY "Users can insert own profile"
    ON profiles FOR INSERT
    WITH CHECK (auth.uid() = id);

-- Service role can do everything with profiles
DROP POLICY IF EXISTS "Service role can manage profiles" ON profiles;
CREATE POLICY "Service role can manage profiles"
    ON profiles FOR ALL
    USING (auth.role() = 'service_role');

-- =====================================================
-- ADDRESSES POLICIES
-- =====================================================
-- Users can only manage their own addresses
DROP POLICY IF EXISTS "Users can view own addresses" ON addresses;
CREATE POLICY "Users can view own addresses"
    ON addresses FOR SELECT
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own addresses" ON addresses;
CREATE POLICY "Users can insert own addresses"
    ON addresses FOR INSERT
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own addresses" ON addresses;
CREATE POLICY "Users can update own addresses"
    ON addresses FOR UPDATE
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own addresses" ON addresses;
CREATE POLICY "Users can delete own addresses"
    ON addresses FOR DELETE
    USING (auth.uid() = user_id);

-- Service role can do everything
DROP POLICY IF EXISTS "Service role can manage addresses" ON addresses;
CREATE POLICY "Service role can manage addresses"
    ON addresses FOR ALL
    USING (auth.role() = 'service_role');

-- =====================================================
-- ORDERS POLICIES
-- =====================================================
-- Users can only view their own orders
DROP POLICY IF EXISTS "Users can view own orders" ON orders;
CREATE POLICY "Users can view own orders"
    ON orders FOR SELECT
    USING (auth.uid() = user_id);

-- Users can create orders
DROP POLICY IF EXISTS "Users can create orders" ON orders;
CREATE POLICY "Users can create orders"
    ON orders FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Users can update their own pending orders (for cancellation)
DROP POLICY IF EXISTS "Users can update own pending orders" ON orders;
CREATE POLICY "Users can update own pending orders"
    ON orders FOR UPDATE
    USING (auth.uid() = user_id AND status = 'pending');

-- Service role (admin) can do everything with orders
DROP POLICY IF EXISTS "Service role can manage orders" ON orders;
CREATE POLICY "Service role can manage orders"
    ON orders FOR ALL
    USING (auth.role() = 'service_role');

-- =====================================================
-- ORDER ITEMS POLICIES
-- =====================================================
-- Users can view items of their own orders
DROP POLICY IF EXISTS "Users can view own order items" ON order_items;
CREATE POLICY "Users can view own order items"
    ON order_items FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM orders
            WHERE orders.id = order_items.order_id
            AND orders.user_id = auth.uid()
        )
    );

-- Users can insert items when creating orders
DROP POLICY IF EXISTS "Users can insert own order items" ON order_items;
CREATE POLICY "Users can insert own order items"
    ON order_items FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM orders
            WHERE orders.id = order_items.order_id
            AND orders.user_id = auth.uid()
        )
    );

-- Service role can do everything
DROP POLICY IF EXISTS "Service role can manage order items" ON order_items;
CREATE POLICY "Service role can manage order items"
    ON order_items FOR ALL
    USING (auth.role() = 'service_role');

-- =====================================================
-- CART POLICIES
-- =====================================================
-- Users can only manage their own cart
DROP POLICY IF EXISTS "Users can manage own cart" ON cart;
CREATE POLICY "Users can manage own cart"
    ON cart FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Service role can do everything
DROP POLICY IF EXISTS "Service role can manage cart" ON cart;
CREATE POLICY "Service role can manage cart"
    ON cart FOR ALL
    USING (auth.role() = 'service_role');

-- =====================================================
-- PROMO CODES POLICIES
-- =====================================================
-- Everyone can view active promo codes to validate them
DROP POLICY IF EXISTS "Promo codes are viewable by everyone" ON promo_codes;
CREATE POLICY "Promo codes are viewable by everyone"
    ON promo_codes FOR SELECT
    USING (active = true);

-- Service role can do everything
DROP POLICY IF EXISTS "Service role can manage promo codes" ON promo_codes;
CREATE POLICY "Service role can manage promo codes"
    ON promo_codes FOR ALL
    USING (auth.role() = 'service_role');

-- =====================================================
-- ORDER STATUS HISTORY POLICIES
-- =====================================================
-- Users can view history of their own orders
DROP POLICY IF EXISTS "Users can view own order history" ON order_status_history;
CREATE POLICY "Users can view own order history"
    ON order_status_history FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM orders
            WHERE orders.id = order_status_history.order_id
            AND orders.user_id = auth.uid()
        )
    );

-- Service role can do everything
DROP POLICY IF EXISTS "Service role can manage order history" ON order_status_history;
CREATE POLICY "Service role can manage order history"
    ON order_status_history FOR ALL
    USING (auth.role() = 'service_role');

-- =====================================================
-- 11. HELPER FUNCTION: Auto-create profile on user signup
-- =====================================================
-- This function automatically creates a profile when a user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, name)
    VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'name', NEW.email));
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to run when new user is created in auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =====================================================
-- 12. SAMPLE DATA
-- =====================================================

-- Example Promo Code (Run this to test)
INSERT INTO public.promo_codes (name, code, discount_percent, valid_from, valid_through)
VALUES ('Welcome Discount', 'WELCOME10', 10, '2024-01-01', '2026-12-31')
ON CONFLICT (code) DO NOTHING;

-- Uncomment below to insert sample products
/*
INSERT INTO products (name, category, description, image_url, variants, tag, rating) VALUES
('Tomato Pickle', 'Veg', 'Homestyle Andhra-style tomato pickle with balanced tang and spice.', 'https://images.unsplash.com/photo-1565557623262-b51c2513a641?q=80&w=600&auto=format&fit=crop', 
 '[{"label": "250 g", "weight": "250 g", "price": 150}, {"label": "500 g", "weight": "500 g", "price": 250}, {"label": "1 kg", "weight": "1 kg", "price": 500}]'::jsonb, 'Veg', 4.5),
('Mango Pickle', 'Veg', 'Classic mango pickle with traditional spices and cold-pressed oil.', 'https://images.unsplash.com/photo-1598514983088-d446927dfb3d?q=80&w=600&auto=format&fit=crop',
 '[{"label": "250 g", "weight": "250 g", "price": 150}, {"label": "500 g", "weight": "500 g", "price": 250}, {"label": "1 kg", "weight": "1 kg", "price": 500}]'::jsonb, 'Veg', 5.0),
('Chicken Pickle', 'Non Veg', 'Spicy Andhra-style chicken pickle, ready-to-eat with rice or rotis.', 'https://images.unsplash.com/photo-1604908176997-1251884b08a5?q=80&w=600&auto=format&fit=crop',
 '[{"label": "250 g", "weight": "250 g", "price": 250}, {"label": "500 g", "weight": "500 g", "price": 450}, {"label": "1 kg", "weight": "1 kg", "price": 900}]'::jsonb, 'Non Veg', 5.0);
*/

-- =====================================================
-- SETUP COMPLETE!
-- =====================================================