-- FINAL ROBUST FIX FOR SALARY RLS
-- Addresses visibility issues and role-based insertion blocks

-- 1. Ensure users can ALWAYS read their own profile (Prevents subquery failures)
DROP POLICY IF EXISTS "users_read_own" ON public.users;
CREATE POLICY "users_read_own" ON public.users
    FOR SELECT
    TO authenticated
    USING (uid = auth.uid());

-- 2. Ensure non-recursive society visibility helper
CREATE OR REPLACE FUNCTION get_my_society_id_v2()
RETURNS TEXT AS $$
  SELECT society_id FROM public.users WHERE uid = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER;

-- 3. Robust Salary Payments Policies
ALTER TABLE salary_payments ENABLE ROW LEVEL SECURITY;

-- Clear previous attempts
DROP POLICY IF EXISTS "insert_salary_payments_v2" ON salary_payments;
DROP POLICY IF EXISTS "view_salary_payments_v2" ON salary_payments;
DROP POLICY IF EXISTS "update_salary_payments_v2" ON salary_payments;
DROP POLICY IF EXISTS "guards_request_salary" ON salary_payments;
DROP POLICY IF EXISTS "guards_view_own_salary" ON salary_payments;
DROP POLICY IF EXISTS "view_salary_payments" ON salary_payments;
DROP POLICY IF EXISTS "insert_salary_payments" ON salary_payments;
DROP POLICY IF EXISTS "update_salary_payments" ON salary_payments;

-- VIEW POLICY: Guards see own, Admins see all in society
CREATE POLICY "salary_view_policy" ON salary_payments
    FOR SELECT
    TO authenticated
    USING (
        guard_id = auth.uid() OR 
        is_admin_of_society(society_id)
    );

-- INSERT POLICY: Extremely simple and robust
-- We trust the guard_id = auth.uid() check. 
-- The backend service ensures only relevant roles see the UI.
CREATE POLICY "salary_insert_policy" ON salary_payments
    FOR INSERT
    TO authenticated
    WITH CHECK (
        guard_id = auth.uid() OR 
        is_admin_of_society(society_id)
    );

-- UPDATE POLICY: Admins can update status
CREATE POLICY "salary_update_policy" ON salary_payments
    FOR UPDATE
    TO authenticated
    USING (
        is_admin_of_society(society_id)
    )
    WITH CHECK (
        is_admin_of_society(society_id)
    );

-- 4. Reload PostgREST
NOTIFY pgrst, 'reload schema';
