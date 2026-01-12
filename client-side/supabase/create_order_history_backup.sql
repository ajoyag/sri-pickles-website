-- Create a separate order_history table as a backup/log
-- Triggered automatically on shop_orders changes

-- 1. Create the table
CREATE TABLE IF NOT EXISTS "public"."order_history" (
    "id" uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    "original_order_id" uuid REFERENCES "public"."shop_orders"("id"),
    "user_id" uuid REFERENCES "auth"."users"("id"),
    "order_data" jsonb, -- Stores the full snapshot of the order at that time
    "status" text,
    "change_type" text, -- INSERT, UPDATE
    "created_at" timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Enable RLS
ALTER TABLE "public"."order_history" ENABLE ROW LEVEL SECURITY;

-- 3. RLS Policies
-- Reset Policies
DROP POLICY IF EXISTS "Admins view all history" ON "public"."order_history";
DROP POLICY IF EXISTS "Users view own history" ON "public"."order_history";

-- Admins can view all
CREATE POLICY "Admins view all history" ON "public"."order_history"
FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM admin_profiles WHERE id = auth.uid() AND is_active = true));

-- Users can view their own history
CREATE POLICY "Users view own history" ON "public"."order_history"
FOR SELECT TO authenticated
USING (auth.uid() = user_id);

-- 4. Function to log changes
CREATE OR REPLACE FUNCTION log_order_history()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'INSERT') THEN
        INSERT INTO "public"."order_history" (original_order_id, user_id, order_data, status, change_type)
        VALUES (NEW.id, NEW.user_id, to_jsonb(NEW), NEW.status, 'INSERT');
        RETURN NEW;
    ELSIF (TG_OP = 'UPDATE') THEN
        -- Only log if status changed or significant update
        IF OLD.status IS DISTINCT FROM NEW.status THEN
             INSERT INTO "public"."order_history" (original_order_id, user_id, order_data, status, change_type)
             VALUES (NEW.id, NEW.user_id, to_jsonb(NEW), NEW.status, 'UPDATE_STATUS');
        END IF;
        RETURN NEW;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Trigger
DROP TRIGGER IF EXISTS on_order_change ON "public"."shop_orders";
CREATE TRIGGER on_order_change
AFTER INSERT OR UPDATE ON "public"."shop_orders"
FOR EACH ROW EXECUTE FUNCTION log_order_history();
