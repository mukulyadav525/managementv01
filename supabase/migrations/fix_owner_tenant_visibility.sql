-- Fix RLS policies to allow owners to view their tenants
-- This ensures owners can see tenant records for flats they own

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view tenants in their flats" ON users;
DROP POLICY IF EXISTS "Owners can view their tenants" ON users;

-- Allow users to view their own record
CREATE POLICY "Users can view own record" ON users
    FOR SELECT
    USING (auth.uid() = uid);

-- Allow owners to view tenants in flats they own
CREATE POLICY "Owners can view their tenants" ON users
    FOR SELECT
    USING (
        role = 'tenant' AND
        EXISTS (
            SELECT 1 FROM flats
            WHERE flats.owner_id = auth.uid()
            AND flats.id = ANY(users.flat_ids)
        )
    );

-- Allow admins to view all users in their society
CREATE POLICY "Admins can view all users in society" ON users
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM users AS admin_user
            WHERE admin_user.uid = auth.uid()
            AND admin_user.role = 'admin'
            AND admin_user.society_id = users.society_id
        )
    );

-- Notify PostgREST to reload schema
NOTIFY pgrst, 'reload schema';
