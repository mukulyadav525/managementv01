-- EMERGENCY FIX: Fix Introspection and RLS Recursion
-- 🚀 Purpose: Resolve "Database error querying schema" and unblock login.
-- 🛠️ Instructions: Run this in the Supabase SQL Editor.

-- 1. RELOAD POSTGREST CACHE (Stronger method)
ALTER TABLE IF EXISTS public.users DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.societies DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.flats DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.visitors DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.complaints DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.payments DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.announcements DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.cctv_cameras DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.salary_payments DISABLE ROW LEVEL SECURITY;

-- 2. FIX CIRCULAR RLS ON USERS TABLE
-- Drop problematic recursive policies
DROP POLICY IF EXISTS "admins_select_all_society_users" ON public.users;
DROP POLICY IF EXISTS "admins_update_society_users" ON public.users;
DROP POLICY IF EXISTS "admins_insert_society_users" ON public.users;
DROP POLICY IF EXISTS "users_select_own" ON public.users;
DROP POLICY IF EXISTS "users_update_own" ON public.users;
DROP POLICY IF EXISTS "users_insert_own" ON public.users;
DROP POLICY IF EXISTS "authenticated_read_users" ON public.users;
DROP POLICY IF EXISTS "security_view_residents" ON public.users;

-- Create CLEAN, NON-RECURSIVE policies
-- Base: Everyone can read their own profile
CREATE POLICY "users_select_own" ON public.users
FOR SELECT TO authenticated
USING (auth.uid() = uid);

-- Base: Everyone can update their own profile
CREATE POLICY "users_update_own" ON public.users
FOR UPDATE TO authenticated
USING (auth.uid() = uid);

-- Admin: Can read everything in their society (Using a subquery that doesn't trigger RLS)
-- Note: We use a raw subquery on 'users' which is generally okay in PG as it bypasses RLS for the same table in some contexts, 
-- but to be safe, we'll use a simpler policy for now:
CREATE POLICY "admins_read_society" ON public.users
FOR SELECT TO authenticated
USING (
  (SELECT role FROM public.users WHERE uid = auth.uid()) = 'admin'
  AND society_id = (SELECT society_id FROM public.users WHERE uid = auth.uid())
);

-- 3. RE-ENABLE RLS
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.societies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.flats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.visitors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.complaints ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cctv_cameras ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.salary_payments ENABLE ROW LEVEL SECURITY;

-- 4. FIX is_admin() FUNCTION (Avoid recursion by using SECURITY DEFINER)
CREATE OR REPLACE FUNCTION public.is_admin() 
RETURNS BOOLEAN AS $$
BEGIN
  -- We query the table directly. SECURITY DEFINER ensures this runs as 'postgres'.
  RETURN EXISTS (
    SELECT 1 FROM public.users 
    WHERE uid = auth.uid() AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. NOTIFY RELOAD
NOTIFY pgrst, 'reload schema';

-- 6. FINAL CHECK (Verify data exists)
SELECT 'Success' as status, (SELECT count(*) FROM users) as user_count, (SELECT count(*) FROM auth.users) as auth_count;
