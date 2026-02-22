-- FIX OWNER STAFF RLS & PERMISSIONS
-- 1. Allow Owners to INSERT/UPDATE staff members mapped to their flats
-- 2. Allow Owners to create/view salary payments for their domestic staff

-- Step 1: Cleanup old policies if exists
DROP POLICY IF EXISTS "owners_insert_domestic_staff" ON public.users;
DROP POLICY IF EXISTS "owners_update_domestic_staff" ON public.users;
DROP POLICY IF EXISTS "owners_manage_own_staff_salary" ON public.salary_payments;

-- Step 2: Update users policies
-- A. Owners can register staff for their society if they tag them as domestic_staff
CREATE POLICY "owners_insert_domestic_staff" ON public.users
    FOR INSERT 
    WITH CHECK (
        auth.uid() IN (
            SELECT owner_id FROM public.flats 
            WHERE id = ANY(flat_ids)
        )
        AND role = 'staff'
        AND staff_type = 'domestic_staff'
    );

-- B. Owners can update staff they have registered
CREATE POLICY "owners_update_domestic_staff" ON public.users
    FOR UPDATE
    USING (
        auth.uid() IN (
            SELECT owner_id FROM public.flats 
            WHERE id = ANY(flat_ids)
        )
        AND role = 'staff'
        AND staff_type = 'domestic_staff'
    );

-- Step 3: Update salary_payments policies
-- Owners can pay their own domestic staff
CREATE POLICY "owners_manage_own_staff_salary" ON public.salary_payments
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.users AS staff_user
            WHERE staff_user.uid = salary_payments.guard_id
            AND staff_user.staff_type = 'domestic_staff'
            AND auth.uid() IN (
                SELECT owner_id FROM public.flats 
                WHERE id = ANY(staff_user.flat_ids)
            )
        )
    );

-- Re-enable RLS just in case
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.salary_payments ENABLE ROW LEVEL SECURITY;
