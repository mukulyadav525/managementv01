-- Comprehensive RLS Fix for Users Table
-- This script fixes the 401 Unauthorized errors by setting up proper RLS policies

-- First, ensure RLS is enabled
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Drop ALL existing policies to start fresh
DROP POLICY IF EXISTS "Users can view own record" ON users;
DROP POLICY IF EXISTS "Owners can view their tenants" ON users;
DROP POLICY IF EXISTS "Admins can view all users in society" ON users;
DROP POLICY IF EXISTS "Users can view tenants in their flats" ON users;
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON users;
DROP POLICY IF EXISTS "Users can update own record" ON users;
DROP POLICY IF EXISTS "Users can insert own record" ON users;

-- Policy 1: Users can SELECT their own record (CRITICAL - without this, login fails)
CREATE POLICY "users_select_own" ON users
    FOR SELECT
    USING (auth.uid() = uid);

-- Policy 2: Users can UPDATE their own record
CREATE POLICY "users_update_own" ON users
    FOR UPDATE
    USING (auth.uid() = uid);

-- Policy 3: Users can INSERT their own record (for registration)
CREATE POLICY "users_insert_own" ON users
    FOR INSERT
    WITH CHECK (auth.uid() = uid);

-- Policy 4: Owners can SELECT tenants in flats they own
CREATE POLICY "owners_select_tenants" ON users
    FOR SELECT
    USING (
        role = 'tenant' AND
        EXISTS (
            SELECT 1 FROM flats
            WHERE flats.owner_id = auth.uid()
            AND flats.id = ANY(users.flat_ids)
        )
    );

-- Policy 5: Admins can SELECT all users in their society
CREATE POLICY "admins_select_all_society_users" ON users
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM users AS admin_user
            WHERE admin_user.uid = auth.uid()
            AND admin_user.role = 'admin'
            AND admin_user.society_id = users.society_id
        )
    );

-- Policy 6: Admins can UPDATE all users in their society
CREATE POLICY "admins_update_society_users" ON users
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM users AS admin_user
            WHERE admin_user.uid = auth.uid()
            AND admin_user.role = 'admin'
            AND admin_user.society_id = users.society_id
        )
    );

-- Policy 7: Admins can INSERT users in their society
CREATE POLICY "admins_insert_society_users" ON users
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM users AS admin_user
            WHERE admin_user.uid = auth.uid()
            AND admin_user.role = 'admin'
            AND admin_user.society_id = users.society_id
        )
    );

-- Notify PostgREST to reload the schema
NOTIFY pgrst, 'reload schema';
