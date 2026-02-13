-- Comprehensive Fix for Salary Schema and RLS
-- Run this in the Supabase SQL Editor

-- 1. Ensure the helper function exists and is robust
CREATE OR REPLACE FUNCTION is_admin_of_society(s_id TEXT)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users 
    WHERE uid = auth.uid() 
    AND role = 'admin' 
    AND society_id = s_id
  );
$$ LANGUAGE sql SECURITY DEFINER;

-- 2. Create Salary Payments Table with correct schema
CREATE TABLE IF NOT EXISTS salary_payments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    society_id TEXT REFERENCES societies(id) ON DELETE CASCADE,
    guard_id UUID REFERENCES users(uid) ON DELETE CASCADE,
    amount DECIMAL(10,2) NOT NULL,
    month TEXT NOT NULL, -- Format: 'YYYY-MM'
    status TEXT DEFAULT 'pending', -- pending, approved, paid
    requested_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    approved_at TIMESTAMP WITH TIME ZONE,
    paid_at TIMESTAMP WITH TIME ZONE,
    approved_by UUID REFERENCES users(uid),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Enable RLS
ALTER TABLE salary_payments ENABLE ROW LEVEL SECURITY;

-- 4. Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "guards_view_own_salary" ON salary_payments;
DROP POLICY IF EXISTS "guards_request_salary" ON salary_payments;
DROP POLICY IF EXISTS "admins_view_all_salaries" ON salary_payments;
DROP POLICY IF EXISTS "admins_update_salaries" ON salary_payments;
DROP POLICY IF EXISTS "admins_delete_salaries" ON salary_payments;

-- 5. Create robust policies using the helper function or direct checks

-- Guards can view their own salary payments
CREATE POLICY "guards_view_own_salary" ON salary_payments
    FOR SELECT
    TO authenticated
    USING (guard_id = auth.uid());

-- Guards can request salary payments
CREATE POLICY "guards_request_salary" ON salary_payments
    FOR INSERT
    TO authenticated
    WITH CHECK (
        guard_id = auth.uid() AND
        EXISTS (
            SELECT 1 FROM users
            WHERE uid = auth.uid() AND role IN ('security', 'staff')
        )
    );

-- Admins can manage all salary payments in their society
CREATE POLICY "admins_manage_salaries" ON salary_payments
    FOR ALL
    TO authenticated
    USING (is_admin_of_society(society_id))
    WITH CHECK (is_admin_of_society(society_id));

-- 6. Ensure Users table RLS allows admins to see security/staff
-- This avoids the second "Failed to load data" toast if UserService.getUsers was failing
DROP POLICY IF EXISTS "authenticated_read_users" ON users;
CREATE POLICY "authenticated_read_users" ON users
    FOR SELECT
    TO authenticated
    USING (true);

-- 7. Notify PostgREST to reload schema
NOTIFY pgrst, 'reload schema';
