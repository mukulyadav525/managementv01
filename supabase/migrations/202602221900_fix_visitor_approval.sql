-- Fix Visitor Update Approval Issue
-- Drop existing update policy
DROP POLICY IF EXISTS "Visitors Update" ON public.visitors;
DROP POLICY IF EXISTS "Residents can update visitors for their flats" ON public.visitors;
DROP POLICY IF EXISTS "Allow admin update visitor" ON public.visitors;
DROP POLICY IF EXISTS "Security can update visitors" ON public.visitors;

-- Create robust Update Policy
CREATE POLICY "Visitors Update" ON public.visitors
FOR UPDATE TO authenticated
USING (
  -- Admins/Staff/Security can update any in their society
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE users.uid = auth.uid() 
    AND (users.role = 'admin' OR users.role = 'staff' OR users.role = 'security')
    AND users.society_id = visitors.society_id
  )
  OR
  -- Residents can update if it's for their flat
  EXISTS (
    SELECT 1 FROM public.flats 
    WHERE flats.id = (SELECT flat_id FROM public.visitors v2 WHERE v2.id = visitors.id)
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
