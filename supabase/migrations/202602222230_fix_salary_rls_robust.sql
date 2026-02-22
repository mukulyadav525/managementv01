-- FINAL CONSOLIDATED SCHEMA & RLS FIX
-- Adds missing columns for salary payments and ensures robust RLS for all roles

-- 1. Add missing columns to salary_payments
ALTER TABLE public.salary_payments 
ADD COLUMN IF NOT EXISTS payment_method TEXT,
ADD COLUMN IF NOT EXISTS transaction_id TEXT;

-- 2. Ensure robust is_admin_of_society helper (case-insensitive)
CREATE OR REPLACE FUNCTION is_admin_of_society(s_id TEXT)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users 
    WHERE uid = auth.uid() 
    AND lower(role) = 'admin' 
    AND society_id = s_id
  );
$$ LANGUAGE sql SECURITY DEFINER;

-- 3. Ensure robust is_resident_of_staff_flat helper for domestic staff
-- Used by owners/tenants to pay their help
CREATE OR REPLACE FUNCTION is_resident_of_staff_flat(staff_uid UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users staff
    JOIN public.users resident ON resident.uid = auth.uid()
    WHERE staff.uid = staff_uid
    AND (staff.role = 'staff' OR staff.role = 'security')
    AND staff.flat_ids && resident.flat_ids
  );
$$ LANGUAGE sql SECURITY DEFINER;

-- 4. Reset Salary Policies for a clean slate
DROP POLICY IF EXISTS "salary_view_policy" ON salary_payments;
DROP POLICY IF EXISTS "salary_insert_policy" ON salary_payments;
DROP POLICY IF EXISTS "salary_update_policy" ON salary_payments;
DROP POLICY IF EXISTS "insert_salary_payments" ON salary_payments;
DROP POLICY IF EXISTS "view_salary_payments" ON salary_payments;
DROP POLICY IF EXISTS "update_salary_payments" ON salary_payments;
DROP POLICY IF EXISTS "guards_view_own_salary" ON salary_payments;
DROP POLICY IF EXISTS "guards_request_salary" ON salary_payments;
DROP POLICY IF EXISTS "admins_manage_salaries" ON salary_payments;
DROP POLICY IF EXISTS "salary_select_policy_final" ON salary_payments;
DROP POLICY IF EXISTS "salary_insert_policy_final" ON salary_payments;
DROP POLICY IF EXISTS "salary_update_policy_final" ON salary_payments;

-- 5. Create FINAL Robust Policies

-- SELECT: Admins see all in society, Guards see own, Residents see their staff's
CREATE POLICY "salary_select_policy_final" ON salary_payments
    FOR SELECT
    TO authenticated
    USING (
        is_admin_of_society(society_id) OR
        guard_id = auth.uid() OR
        is_resident_of_staff_flat(guard_id)
    );

-- INSERT: Guards can request (own), Admins can record, Residents can record (for their staff)
CREATE POLICY "salary_insert_policy_final" ON salary_payments
    FOR INSERT
    TO authenticated
    WITH CHECK (
        (guard_id = auth.uid() AND EXISTS (SELECT 1 FROM public.users WHERE uid = auth.uid() AND lower(role) IN ('security', 'staff'))) OR
        is_admin_of_society(society_id) OR
        is_resident_of_staff_flat(guard_id)
    );

-- UPDATE: Admins can update status, Residents can update their staff's records (mark as paid)
CREATE POLICY "salary_update_policy_final" ON salary_payments
    FOR UPDATE
    TO authenticated
    USING (
        is_admin_of_society(society_id) OR
        is_resident_of_staff_flat(guard_id)
    )
    WITH CHECK (
        is_admin_of_society(society_id) OR
        is_resident_of_staff_flat(guard_id)
    );

-- 6. Reload schema
NOTIFY pgrst, 'reload schema';
