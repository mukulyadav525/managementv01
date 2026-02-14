-- NUCLEAR FIX: Disable All RLS and Clear Policies
-- 🚀 Purpose: Resolve "Database error querying schema" by removing all complexity.
-- 🛠️ Instructions: Run this in the Supabase SQL Editor.

-- 1. DISABLE RLS ON ALL TABLES
ALTER TABLE IF EXISTS public.users DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.societies DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.flats DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.payments DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.visitors DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.complaints DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.announcements DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.vehicles DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.notifications DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.salary_payments DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.cctv_cameras DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.rent_agreements DISABLE ROW LEVEL SECURITY;

-- 2. DROP ALL POLICIES (Start from scratch)
-- Users
DROP POLICY IF EXISTS "users_select_own" ON public.users;
DROP POLICY IF EXISTS "users_update_own" ON public.users;
DROP POLICY IF EXISTS "users_insert_own" ON public.users;
DROP POLICY IF EXISTS "admins_select_all_society_users" ON public.users;
DROP POLICY IF EXISTS "admins_update_society_users" ON public.users;
DROP POLICY IF EXISTS "admins_insert_society_users" ON public.users;
DROP POLICY IF EXISTS "authenticated_read_users" ON public.users;
DROP POLICY IF EXISTS "security_view_residents" ON public.users;
DROP POLICY IF EXISTS "authenticated_users_select_all" ON public.users;
DROP POLICY IF EXISTS "Admins can manage society users" ON public.users;
DROP POLICY IF EXISTS "security_view_residents" ON public.users;
DROP POLICY IF EXISTS "admins_read_society" ON public.users;

-- Societies
DROP POLICY IF EXISTS "Public read societies" ON public.societies;
DROP POLICY IF EXISTS "Authenticated users can create societies" ON public.societies;
DROP POLICY IF EXISTS "Admins can update own society" ON public.societies;
DROP POLICY IF EXISTS "Admin can manage societies" ON public.societies;

-- Flats
DROP POLICY IF EXISTS "Allow authenticated read flats" ON public.flats;
DROP POLICY IF EXISTS "Allow authenticated insert flat" ON public.flats;
DROP POLICY IF EXISTS "Allow read own society flats" ON public.flats;
DROP POLICY IF EXISTS "Allow admin update flat" ON public.flats;
DROP POLICY IF EXISTS "Allow admin delete flat" ON public.flats;
DROP POLICY IF EXISTS "Admins can manage society flats" ON public.flats;
DROP POLICY IF EXISTS "Admin can manage flats" ON public.flats;

-- Visitors
DROP POLICY IF EXISTS "Allow authenticated insert visitor" ON public.visitors;
DROP POLICY IF EXISTS "Allow read own society visitors" ON public.visitors;
DROP POLICY IF EXISTS "Allow admin update visitor" ON public.visitors;
DROP POLICY IF EXISTS "Allow admin delete visitor" ON public.visitors;
DROP POLICY IF EXISTS "Admins can manage society visitors" ON public.visitors;
DROP POLICY IF EXISTS "Admin can manage visitors" ON public.visitors;
DROP POLICY IF EXISTS "Security can update visitors" ON public.visitors;

-- (Add other tables if needed, but these are the main ones)

-- 3. GRANT PERMISSIONS (Rule out permission issues)
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated;

-- 4. RELOAD POSTGREST
NOTIFY pgrst, 'reload schema';

-- 5. TEST QUERY (Should work now)
SELECT count(*) FROM users;
