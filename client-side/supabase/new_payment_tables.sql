-- 0. Order Status History (Ensuring it exists for 'shop_orders')
CREATE TABLE IF NOT EXISTS order_status_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID NOT NULL REFERENCES shop_orders(id) ON DELETE CASCADE,
    status VARCHAR(50) NOT NULL,
    notes TEXT,
    changed_by UUID REFERENCES profiles(id), -- Assuming profiles exists
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE order_status_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own order history" ON order_status_history;
CREATE POLICY "Users can view own order history" ON order_status_history
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM shop_orders WHERE shop_orders.id = order_status_history.order_id AND shop_orders.user_id = auth.uid())
    );

-- 1. Payment Process Tracking
CREATE TABLE IF NOT EXISTS payment_process (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID REFERENCES shop_orders(id) ON DELETE CASCADE,
    process_step VARCHAR(50) NOT NULL, -- 'INITIATED', 'REDIRECTED', 'CALLBACK_RECEIVED', 'VERIFIED', 'CONFIRMED'
    status VARCHAR(50) NOT NULL, -- 'PENDING', 'SUCCESS', 'FAILED'
    transaction_id VARCHAR(100), -- PhonePe Transaction ID
    amount DECIMAL(10,2),
    meta_data JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE payment_process ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own payment process" ON payment_process;
CREATE POLICY "Users can view own payment process" ON payment_process
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM shop_orders WHERE shop_orders.id = payment_process.order_id AND shop_orders.user_id = auth.uid())
    );

-- 2. Invoice Table
CREATE TABLE IF NOT EXISTS invoices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID REFERENCES shop_orders(id) ON DELETE CASCADE,
    invoice_number VARCHAR(100) UNIQUE,
    invoice_date TIMESTAMPTZ DEFAULT NOW(),
    customer_details JSONB,
    items_snapshot JSONB,
    total_amount DECIMAL(10,2),
    pdf_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own invoices" ON invoices;
CREATE POLICY "Users can view own invoices" ON invoices
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM shop_orders WHERE shop_orders.id = invoices.order_id AND shop_orders.user_id = auth.uid())
    );

-- 3. Order History (Archived/Delivered Orders)
CREATE TABLE IF NOT EXISTS completed_orders_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    original_order_id UUID, 
    user_id UUID REFERENCES profiles(id),
    order_number VARCHAR(50),
    final_status VARCHAR(50),
    delivered_at TIMESTAMPTZ DEFAULT NOW(),
    full_order_snapshot JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE completed_orders_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own completed history" ON completed_orders_history;
CREATE POLICY "Users can view own completed history" ON completed_orders_history
    FOR SELECT USING (user_id = auth.uid());


-- 4. Order Backup Table
CREATE TABLE IF NOT EXISTS order_backups (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    original_order_id UUID,
    backup_trigger VARCHAR(50),
    order_data JSONB,
    backed_up_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE order_backups ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view backups" ON order_backups;
CREATE POLICY "Admins can view backups" ON order_backups
    FOR ALL USING (auth.role() = 'service_role');


-- =====================================================
-- TRIGGERS & FUNCTIONS
-- =====================================================

-- Trigger: Backup Order
CREATE OR REPLACE FUNCTION backup_order_func()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO order_backups (original_order_id, backup_trigger, order_data)
    VALUES (
        NEW.id, 
        TG_OP, 
        row_to_json(NEW)::jsonb
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_backup_orders ON shop_orders;
CREATE TRIGGER trigger_backup_orders
    AFTER INSERT OR UPDATE ON shop_orders
    FOR EACH ROW
    EXECUTE FUNCTION backup_order_func();


-- Trigger: Complete Order & Invoice
CREATE OR REPLACE FUNCTION handle_order_completion()
RETURNS TRIGGER AS $$
BEGIN
    -- Log Status Change to History
    IF OLD.status IS DISTINCT FROM NEW.status THEN
        INSERT INTO order_status_history (order_id, status, notes, changed_by)
        VALUES (NEW.id, NEW.status, NEW.notes, auth.uid());
    END IF;

    -- Move to History if Delivered
    IF NEW.status = 'delivered' AND OLD.status != 'delivered' THEN
        INSERT INTO completed_orders_history (original_order_id, user_id, order_number, final_status, full_order_snapshot)
        VALUES (NEW.id, NEW.user_id, NEW.order_number, NEW.status, row_to_json(NEW)::jsonb);
    END IF;

    -- Create Invoice if Processing (Confirmed)
    IF NEW.status = 'processing' AND OLD.status != 'processing' THEN
        INSERT INTO invoices (order_id, invoice_number, customer_details, items_snapshot, total_amount)
        VALUES (
            NEW.id,
            'INV-' || NEW.order_number,
            NEW.shipping_address,
            NULL, 
            NEW.total_amount
        );
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_order_completion ON shop_orders;
CREATE TRIGGER trigger_order_completion
    AFTER UPDATE ON shop_orders
    FOR EACH ROW
    EXECUTE FUNCTION handle_order_completion();
