-- Allow residents to add domestic staff mapped to their flats
-- Fixes the 'new row violates row-level security policy for table "users"' error
-- when owners/tenants try to add domestic help.

DROP POLICY IF EXISTS "Residents can insert domestic staff" ON public.users;

CREATE POLICY "Residents can insert domestic staff" ON public.users
FOR INSERT TO authenticated
WITH CHECK (
    -- Ensure they are inserting a staff member
    role = 'staff' 
    AND staff_type = 'domestic_staff'
    -- Ensure it's for the same society
    AND society_id = (
        SELECT society_id FROM public.users AS current_user 
        WHERE current_user.uid = auth.uid()
    )
    -- Ensure the staff is being mapped to a flat the resident owns or rents
    AND EXISTS (
        SELECT 1 FROM public.flats 
        WHERE flats.id = ANY(flat_ids)
        AND (flats.owner_id = auth.uid() OR flats.tenant_id = auth.uid())
    )
    -- Optional: you can uncomment this if you also want to restrict to authenticated uid matches, 
    -- but usually staff are inserted directly without auth records if created locally.
    -- If Supabase Auth is strictly enforced, the uid MUST exist in auth.users first.
);

-- Also ensure updating is allowed for their own staff
DROP POLICY IF EXISTS "Residents can update their domestic staff" ON public.users;

CREATE POLICY "Residents can update their domestic staff" ON public.users
FOR UPDATE TO authenticated
USING (
    role = 'staff' 
    AND staff_type = 'domestic_staff'
    AND EXISTS (
        SELECT 1 FROM public.flats 
        WHERE flats.id = ANY(flat_ids)
        AND (flats.owner_id = auth.uid() OR flats.tenant_id = auth.uid())
    )
)
WITH CHECK (
    role = 'staff' 
    AND staff_type = 'domestic_staff'
    AND EXISTS (
        SELECT 1 FROM public.flats 
        WHERE flats.id = ANY(flat_ids)
        AND (flats.owner_id = auth.uid() OR flats.tenant_id = auth.uid())
    )
);

-- Note: Ensure that the SELECT policy on users allows residents to SEE domestic staff
-- The previously added "society_members_select_each_other" should cover this.
