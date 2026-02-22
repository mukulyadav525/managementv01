-- This script fixes the RLS issue completely for Admins and Residents
-- It allows Admins to update Visitor statuses (like approving them)
-- and allows Residents (owners/tenants) to approve visitors for their own flats.

DROP POLICY IF EXISTS "Visitors Update" ON public.visitors;
DROP POLICY IF EXISTS "Residents can update visitors for their flats" ON public.visitors;
DROP POLICY IF EXISTS "Allow admin update visitor" ON public.visitors;
DROP POLICY IF EXISTS "Security can update visitors" ON public.visitors;

CREATE POLICY "Visitors Update" ON public.visitors
FOR UPDATE TO authenticated
USING (
  -- Admins, Staff, and Security can update visitors in their society
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE users.uid = auth.uid() 
    AND (users.role = 'admin' OR users.role = 'staff' OR users.role = 'security')
    AND users.society_id = visitors.society_id
  )
  OR
  -- Owners and Tenants can update visitors meant for their flat
  EXISTS (
    SELECT 1 FROM public.flats 
    WHERE flats.id = visitors.flat_id 
    AND (flats.owner_id = auth.uid() OR flats.tenant_id = auth.uid())
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE users.uid = auth.uid() 
    AND (users.role = 'admin' OR users.role = 'staff' OR users.role = 'security')
    AND users.society_id = visitors.society_id
  )
  OR
  EXISTS (
    SELECT 1 FROM public.flats 
    WHERE flats.id = visitors.flat_id 
    AND (flats.owner_id = auth.uid() OR flats.tenant_id = auth.uid())
  )
);
