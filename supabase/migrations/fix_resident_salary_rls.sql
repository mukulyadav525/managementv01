-- SQL Fix for Resident Salary Management RLS
-- Allows Owner and Tenants to manage salary payments for their domestic staff

-- 1. Helper function to check if a user is a resident of a flat where a staff member works
CREATE OR REPLACE FUNCTION is_resident_of_staff_flat(staff_uid UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users staff
    JOIN public.users resident ON resident.uid = auth.uid()
    WHERE staff.uid = staff_uid
    AND staff.role = 'staff'
    AND staff.flat_ids && resident.flat_ids
  );
$$ LANGUAGE sql SECURITY DEFINER;

-- 2. Update Salary Payments Policies

-- Drop existing restrictive policies
DROP POLICY IF EXISTS "guards_view_own_salary" ON salary_payments;
DROP POLICY IF EXISTS "guards_request_salary" ON salary_payments;
DROP POLICY IF EXISTS "view_salary_payments" ON salary_payments;
DROP POLICY IF EXISTS "insert_salary_payments" ON salary_payments;
DROP POLICY IF EXISTS "update_salary_payments" ON salary_payments;

-- Re-create selective view policy: Guards see own, Residents see their staff's
CREATE POLICY "view_salary_payments" ON salary_payments
    FOR SELECT
    TO authenticated
    USING (
        guard_id = auth.uid() OR 
        is_resident_of_staff_flat(guard_id) OR
        is_admin_of_society(society_id)
    );

-- Allow residents and guards to insert salary records
-- Guards can request (pending), Residents can record (paid)
CREATE POLICY "insert_salary_payments" ON salary_payments
    FOR INSERT
    TO authenticated
    WITH CHECK (
        (guard_id = auth.uid() AND EXISTS (SELECT 1 FROM users WHERE uid = auth.uid() AND role IN ('security', 'staff'))) OR
        (is_resident_of_staff_flat(guard_id)) OR
        (is_admin_of_society(society_id))
    );

-- Allow residents to update notes or status of their staff's payments (if needed)
CREATE POLICY "update_salary_payments" ON salary_payments
    FOR UPDATE
    TO authenticated
    USING (
        is_resident_of_staff_flat(guard_id) OR
        is_admin_of_society(society_id)
    )
    WITH CHECK (
        is_resident_of_staff_flat(guard_id) OR
        is_admin_of_society(society_id)
    );

-- 3. Notify PostgREST to reload schema
NOTIFY pgrst, 'reload schema';
