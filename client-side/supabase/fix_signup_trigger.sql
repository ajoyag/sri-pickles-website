-- Fix for "Database error saving new user"
-- This script replaces the handle_new_user function and trigger to be more robust.
-- IMPORTANT: Run this in your Supabase SQL Editor.

-- 1. Drop existing trigger to ensure clean state
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- 2. Update the function to handle Profile creation safely
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    -- Attempt to insert the new profile
    -- We include the phone number from metadata if available
    INSERT INTO public.profiles (id, name, phone)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'name', NEW.email),
        NEW.raw_user_meta_data->>'phone'
    )
    ON CONFLICT (id) DO UPDATE
    SET
        name = EXCLUDED.name,
        -- Update phone only if the existing one is null (preserve existing data)
        phone = COALESCE(public.profiles.phone, EXCLUDED.phone),
        updated_at = NOW();

    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        -- Log the error so we can see it in Supabase logs
        RAISE WARNING 'Error in handle_new_user trigger: %', SQLERRM;
        -- IMPORTANT: Return NEW so the user authentication is NOT blocked.
        -- This prevents "Database error saving new user" from stopping the signup.
        -- The profile can be created/updated later by the client if this fails.
        RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Recreate the trigger
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 4. Verify/Ensure permissions (Just in case)
GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON public.profiles TO postgres, service_role;
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
-- Allow new users (anon/authenticated) to view profiles if policies allow, but trigger runs as definer (admin) so this is extra.
