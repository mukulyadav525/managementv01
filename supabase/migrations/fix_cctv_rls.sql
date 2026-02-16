-- FIX CCTV RLS POLICIES
-- 🚀 Purpose: Allow admins to manage cameras and security/admins to view them.

-- 1. Enable RLS
ALTER TABLE public.cctv_cameras ENABLE ROW LEVEL SECURITY;

-- 2. Drop existing policies to start fresh for this table
DROP POLICY IF EXISTS "security_admin_view_cctv" ON public.cctv_cameras;
DROP POLICY IF EXISTS "security_and_admins_view_cctv" ON public.cctv_cameras;
DROP POLICY IF EXISTS "admins_manage_cctv" ON public.cctv_cameras;

-- 3. Create comprehensive 'FOR ALL' policy for Admins
-- This allows INSERT, SELECT, UPDATE, DELETE
CREATE POLICY "admins_manage_cctv" ON public.cctv_cameras
    FOR ALL
    TO authenticated
    USING (public.check_is_admin(society_id))
    WITH CHECK (public.check_is_admin(society_id));

-- 4. Create 'FOR SELECT' policy for Security 
-- Admins are already covered by the policy above, but security needs this.
CREATE POLICY "security_view_cctv" ON public.cctv_cameras
    FOR SELECT
    TO authenticated
    USING (
        public.check_user_role(ARRAY['security'])
        AND public.check_user_society(society_id)
    );

-- Reload schema
NOTIFY pgrst, 'reload schema';
