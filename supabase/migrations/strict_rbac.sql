-- STRICT RBAC RESET & IMPLEMENTATION
-- 🚀 Purpose: Centralize all security logic and fix "Database error querying schema" (Recursion).
-- 🛠️ Instructions: Run this in the Supabase SQL Editor.

-- ==========================================
-- 0. CLEANUP: Start with a total blank slate
-- ==========================================
DO $$
DECLARE
    r RECORD;
BEGIN
    -- Drop all policies from public schema
    FOR r IN (SELECT policyname, tablename FROM pg_policies WHERE schemaname = 'public') LOOP
        EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON ' || quote_ident(r.tablename);
    END LOOP;
END $$;

-- ==========================================
-- 1. SECURITY DEFINER HELPERS (Non-Recursive)
-- ==========================================

-- Helper: Get current user's role and society_id without triggering RLS
CREATE OR REPLACE FUNCTION public.get_auth_context()
RETURNS TABLE (role TEXT, society_id TEXT) AS $$
BEGIN
    RETURN QUERY 
    SELECT u.role, u.society_id 
    FROM public.users u 
    WHERE u.uid = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper: Check if user is Admin of a society
CREATE OR REPLACE FUNCTION public.is_admin(target_soc_id TEXT DEFAULT NULL)
RETURNS BOOLEAN AS $$
DECLARE
    current_role TEXT;
    current_soc_id TEXT;
BEGIN
    SELECT u.role, u.society_id INTO current_role, current_soc_id 
    FROM public.users u WHERE u.uid = auth.uid();
    
    IF current_role = 'admin' THEN
        IF target_soc_id IS NULL OR current_soc_id = target_soc_id THEN
            RETURN TRUE;
        END IF;
    END IF;
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper: Check if user is Resident/Staff of a society
CREATE OR REPLACE FUNCTION public.is_member(target_soc_id TEXT)
RETURNS BOOLEAN AS $$
DECLARE
    current_soc_id TEXT;
BEGIN
    SELECT u.society_id INTO current_soc_id 
    FROM public.users u WHERE u.uid = auth.uid();
    RETURN current_soc_id = target_soc_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==========================================
-- 2. TABLE POLICIES: USERS
-- ==========================================
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_self_all" ON users
    FOR ALL USING (auth.uid() = uid);

CREATE POLICY "admin_manage_society_users" ON users
    FOR ALL USING (public.is_admin(society_id));

CREATE POLICY "security_view_society_users" ON users
    FOR SELECT USING (
        (SELECT u.role FROM public.users u WHERE u.uid = auth.uid()) = 'security'
        AND society_id = (SELECT u.society_id FROM public.users u WHERE u.uid = auth.uid())
    );

-- ==========================================
-- 3. TABLE POLICIES: SOCIETIES
-- ==========================================
ALTER TABLE societies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anyone_read_societies" ON societies
    FOR SELECT USING (true);

CREATE POLICY "admin_update_own_society" ON societies
    FOR UPDATE USING (public.is_admin(id));

-- ==========================================
-- 4. TABLE POLICIES: FLATS
-- ==========================================
ALTER TABLE flats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "member_read_society_flats" ON flats
    FOR SELECT USING (public.is_member(society_id));

CREATE POLICY "admin_manage_society_flats" ON flats
    FOR ALL USING (public.is_admin(society_id));

-- ==========================================
-- 5. TABLE POLICIES: VISITORS
-- ==========================================
ALTER TABLE visitors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "member_read_society_visitors" ON visitors
    FOR SELECT USING (public.is_member(society_id));

CREATE POLICY "security_admin_manage_visitors" ON visitors
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE uid = auth.uid() AND role IN ('admin', 'security')
        )
        AND public.is_member(society_id)
    );

-- ==========================================
-- 6. TABLE POLICIES: PAYMENTS
-- ==========================================
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_read_own_payments" ON payments
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "admin_manage_society_payments" ON payments
    FOR ALL USING (public.is_admin(society_id));

-- ==========================================
-- 7. OTHER TABLES (CCTV, Salary, etc.)
-- ==========================================
ALTER TABLE salary_payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "guard_view_own" ON salary_payments FOR SELECT USING (guard_id = auth.uid());
CREATE POLICY "admin_manage_salaries" ON salary_payments FOR ALL USING (public.is_admin(society_id));

ALTER TABLE cctv_cameras ENABLE ROW LEVEL SECURITY;
CREATE POLICY "security_admin_view_cctv" ON cctv_cameras FOR SELECT 
USING (
    EXISTS (SELECT 1 FROM public.users WHERE uid = auth.uid() AND role IN ('admin', 'security'))
    AND public.is_member(society_id)
);

-- ==========================================
-- 8. FINALIZATION
-- ==========================================
NOTIFY pgrst, 'reload schema';
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon;
