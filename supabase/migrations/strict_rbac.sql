-- STRICT RBAC IMPLEMENTATION (V3 - FULL CRUD + NO RECURSION)
-- 🚀 Purpose: Add missing INSERT/UPDATE policies and fix registration hangs.
-- 🛠️ Instructions: Run this in the Supabase SQL Editor.

-- ==========================================
-- 0. CLEANUP
-- ==========================================
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT policyname, tablename FROM pg_policies WHERE schemaname = 'public') LOOP
        EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON ' || quote_ident(r.tablename);
    END LOOP;
END $$;

-- ==========================================
-- 1. SECURITY DEFINER HELPERS
-- ==========================================

CREATE OR REPLACE FUNCTION public.check_user_role(required_roles TEXT[])
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users 
    WHERE uid = auth.uid() AND role = ANY(required_roles)
  );
$$ LANGUAGE sql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.check_user_society(target_soc_id TEXT)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users 
    WHERE uid = auth.uid() AND society_id = target_soc_id
  );
$$ LANGUAGE sql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.check_is_admin(target_soc_id TEXT DEFAULT NULL)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users 
    WHERE uid = auth.uid() 
    AND role = 'admin' 
    AND (target_soc_id IS NULL OR society_id = target_soc_id)
  );
$$ LANGUAGE sql SECURITY DEFINER;

-- ==========================================
-- 2. TABLE POLICIES: USERS
-- ==========================================
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_self_all" ON public.users
    FOR ALL USING (auth.uid() = uid)
    WITH CHECK (auth.uid() = uid);

CREATE POLICY "admin_manage_society_users" ON public.users
    FOR ALL USING (public.check_is_admin(society_id));

CREATE POLICY "security_view_society_users" ON public.users
    FOR SELECT USING (
        public.check_user_role(ARRAY['security']) 
        AND public.check_user_society(society_id)
    );

-- ==========================================
-- 3. TABLE POLICIES: SOCIETIES
-- ==========================================
ALTER TABLE public.societies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anyone_read_societies" ON public.societies
    FOR SELECT USING (true);

-- CRITICAL: Allow admins to create their society during registration
CREATE POLICY "admin_insert_societies" ON public.societies
    FOR INSERT TO authenticated
    WITH CHECK (public.check_user_role(ARRAY['admin']));

CREATE POLICY "admin_update_own_society" ON public.societies
    FOR UPDATE USING (public.check_is_admin(id));

-- ==========================================
-- 4. TABLE POLICIES: FLATS
-- ==========================================
ALTER TABLE public.flats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "member_read_society_flats" ON public.flats
    FOR SELECT USING (public.check_user_society(society_id));

CREATE POLICY "admin_manage_society_flats" ON public.flats
    FOR ALL USING (public.check_is_admin(society_id));

-- ==========================================
-- 5. TABLE POLICIES: VISITORS
-- ==========================================
ALTER TABLE public.visitors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "member_read_visitors" ON public.visitors
    FOR SELECT USING (public.check_user_society(society_id));

-- Allow residents to invite visitors
CREATE POLICY "resident_insert_visitors" ON public.visitors
    FOR INSERT TO authenticated
    WITH CHECK (public.check_user_society(society_id));

CREATE POLICY "security_admin_manage_visitors" ON public.visitors
    FOR ALL USING (
        (public.check_user_role(ARRAY['admin', 'security']))
        AND public.check_user_society(society_id)
    );

-- ==========================================
-- 6. TABLE POLICIES: PAYMENTS
-- ==========================================
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_read_own_payments" ON public.payments
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "user_insert_own_payments" ON public.payments
    FOR INSERT TO authenticated
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "admin_manage_society_payments" ON public.payments
    FOR ALL USING (public.check_is_admin(society_id));

-- ==========================================
-- 7. COMPLAINTS
-- ==========================================
ALTER TABLE public.complaints ENABLE ROW LEVEL SECURITY;

CREATE POLICY "member_read_complaints" ON public.complaints
    FOR SELECT USING (public.check_user_society(society_id));

CREATE POLICY "member_insert_complaints" ON public.complaints
    FOR INSERT TO authenticated
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "admin_manage_complaints" ON public.complaints
    FOR ALL USING (public.check_is_admin(society_id));

-- ==========================================
-- 8. ANNOUNCEMENTS
-- ==========================================
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "member_read_announcements" ON public.announcements
    FOR SELECT USING (public.check_user_society(society_id));

CREATE POLICY "admin_manage_announcements" ON public.announcements
    FOR ALL USING (public.check_is_admin(society_id));

-- ==========================================
-- 9. OTHER TABLES
-- ==========================================
ALTER TABLE public.salary_payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "guard_view_own_salary" ON public.salary_payments FOR SELECT USING (guard_id = auth.uid());
CREATE POLICY "admin_manage_society_salaries" ON public.salary_payments FOR ALL USING (public.check_is_admin(society_id));

ALTER TABLE public.cctv_cameras ENABLE ROW LEVEL SECURITY;
CREATE POLICY "security_admin_view_cctv" ON public.cctv_cameras FOR SELECT 
USING (
    public.check_user_role(ARRAY['admin', 'security'])
    AND public.check_user_society(society_id)
);

ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "member_read_vehicles" ON public.vehicles FOR SELECT USING (public.check_user_society(society_id));
CREATE POLICY "user_manage_own_vehicles" ON public.vehicles FOR ALL USING (user_id = auth.uid());
CREATE POLICY "admin_manage_society_vehicles" ON public.vehicles FOR ALL USING (public.check_is_admin(society_id));

-- ==========================================
-- 10. FINALIZATION
-- ==========================================
NOTIFY pgrst, 'reload schema';
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO postgres, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon;
