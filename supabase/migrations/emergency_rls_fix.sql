-- EMERGENCY FIX: Allow basic access to users table
-- Run this FIRST if you can't even log in

-- Temporarily disable RLS to allow access
ALTER TABLE users DISABLE ROW LEVEL SECURITY;

-- Re-enable it immediately
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Create the most basic policy: authenticated users can read all users
-- This is NOT secure for production but will get you unblocked
DROP POLICY IF EXISTS "authenticated_users_select_all" ON users;
CREATE POLICY "authenticated_users_select_all" ON users
    FOR SELECT
    TO authenticated
    USING (true);

-- Allow users to update their own records
DROP POLICY IF EXISTS "users_update_own" ON users;
CREATE POLICY "users_update_own" ON users
    FOR UPDATE
    TO authenticated
    USING (auth.uid() = uid);

-- Allow users to insert their own records
DROP POLICY IF EXISTS "users_insert_own" ON users;
CREATE POLICY "users_insert_own" ON users
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = uid);

-- Notify PostgREST
NOTIFY pgrst, 'reload schema';
