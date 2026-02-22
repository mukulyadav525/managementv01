-- Robust Fix for Salary Payments RLS
-- Addresses issues with case-sensitivity and subquery access

-- 1. Ensure the is_admin_of_society function is case-insensitive and robust
CREATE OR REPLACE FUNCTION is_admin_of_society(s_id TEXT)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users 
    WHERE uid = auth.uid() 
    AND lower(role) = 'admin' 
    AND society_id = s_id
  );
$$ LANGUAGE sql SECURITY DEFINER;

-- 2. Drop existing problematic policies
DROP POLICY IF EXISTS "insert_salary_payments" ON salary_payments;
DROP POLICY IF EXISTS "view_salary_payments" ON salary_payments;
DROP POLICY IF EXISTS "update_salary_payments" ON salary_payments;
DROP POLICY IF EXISTS "guards_request_salary" ON salary_payments;
DROP POLICY IF EXISTS "guards_view_own_salary" ON salary_payments;

-- 3. Create Robust Policies

-- VIEW: Guards see own, Residents see their staff's, Admins see all in society
CREATE POLICY "view_salary_payments_v2" ON salary_payments
    FOR SELECT
    TO authenticated
    USING (
        guard_id = auth.uid() OR 
        is_admin_of_society(society_id) OR
        EXISTS (
            SELECT 1 FROM public.users resident
            JOIN public.users staff ON staff.uid = salary_payments.guard_id
            WHERE resident.uid = auth.uid()
            AND lower(staff.role) = 'staff'
            AND staff.flat_ids && resident.flat_ids
        )
    );

-- INSERT: Guards can request (pending), Residents/Admins can record
CREATE POLICY "insert_salary_payments_v2" ON salary_payments
    FOR INSERT
    TO authenticated
    WITH CHECK (
        -- Option 1: User is a guard/staff requesting for themselves
        (
            guard_id = auth.uid() AND 
            EXISTS (
                SELECT 1 FROM public.users 
                WHERE uid = auth.uid() 
                AND lower(role) IN ('security', 'staff')
            )
        ) 
        OR
        -- Option 2: User is an admin of the society
        is_admin_of_society(society_id)
        OR
        -- Option 3: User is a resident recording for their domestic staff
        EXISTS (
            SELECT 1 FROM public.users resident
            JOIN public.users staff ON staff.uid = guard_id
            WHERE resident.uid = auth.uid()
            AND lower(staff.role) = 'staff'
            AND staff.flat_ids && resident.flat_ids
        )
    );

-- UPDATE: Admins can update status, Residents can update notes
CREATE POLICY "update_salary_payments_v2" ON salary_payments
    FOR UPDATE
    TO authenticated
    USING (
        is_admin_of_society(society_id) OR
        EXISTS (
            SELECT 1 FROM public.users resident
            JOIN public.users staff ON staff.uid = salary_payments.guard_id
            WHERE resident.uid = auth.uid()
            AND lower(staff.role) = 'staff'
            AND staff.flat_ids && resident.flat_ids
        )
    );

-- 4. Ensure PostgREST reloads
NOTIFY pgrst, 'reload schema';
