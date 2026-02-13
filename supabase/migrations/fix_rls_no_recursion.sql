-- Fixed RLS Policies - No Infinite Recursion
-- This version avoids circular references in policies

-- Ensure RLS is enabled
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Drop ALL existing policies
DROP POLICY IF EXISTS "users_select_own" ON users;
DROP POLICY IF EXISTS "users_update_own" ON users;
DROP POLICY IF EXISTS "users_insert_own" ON users;
DROP POLICY IF EXISTS "owners_select_tenants" ON users;
DROP POLICY IF EXISTS "admins_select_all_society_users" ON users;
DROP POLICY IF EXISTS "admins_update_society_users" ON users;
DROP POLICY IF EXISTS "admins_insert_society_users" ON users;
DROP POLICY IF EXISTS "authenticated_users_select_all" ON users;

-- Simple, non-recursive policies:

-- 1. Allow all authenticated users to SELECT from users table
-- (We'll add more restrictive policies later once the app is working)
CREATE POLICY "authenticated_read_users" ON users
    FOR SELECT
    TO authenticated
    USING (true);

-- 2. Users can UPDATE their own record
CREATE POLICY "users_update_self" ON users
    FOR UPDATE
    TO authenticated
    USING (auth.uid() = uid)
    WITH CHECK (auth.uid() = uid);

-- 3. Users can INSERT their own record (for registration)
CREATE POLICY "users_insert_self" ON users
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = uid);

-- Notify PostgREST to reload
NOTIFY pgrst, 'reload schema';
