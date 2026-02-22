-- Consolidated Visitor RLS Fix
-- 🚀 Goal: Allow proper status updates (Approval, Rejection, Checkout) by authorized roles.

-- 1. Enable RLS
ALTER TABLE public.visitors ENABLE ROW LEVEL SECURITY;

-- 2. Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Strict Visitor Visibility" ON public.visitors;
DROP POLICY IF EXISTS "Allow authenticated insert visitor" ON public.visitors;
DROP POLICY IF EXISTS "Allow read own society visitors" ON public.visitors;
DROP POLICY IF EXISTS "Allow admin update visitor" ON public.visitors;
DROP POLICY IF EXISTS "Allow admin delete visitor" ON public.visitors;
DROP POLICY IF EXISTS "Residents can update visitors for their flats" ON public.visitors;
DROP POLICY IF EXISTS "Residents can view visitors for their flats" ON public.visitors;
DROP POLICY IF EXISTS "Security can update visitors" ON public.visitors;

-- 3. INSERT: Any authenticated user can create a visitor entry
-- (Validation happens at the application level; security/admins often register visitors)
CREATE POLICY "Visitors Insert" ON public.visitors
FOR INSERT TO authenticated
WITH CHECK (true);

-- 4. SELECT: 
-- Admins/Staff see all in society; Residents see for their own flats
CREATE POLICY "Visitors Select" ON public.visitors
FOR SELECT TO authenticated
USING (
  (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE users.uid = auth.uid() 
      AND (users.role = 'admin' OR users.role = 'staff' OR users.role = 'security')
      AND users.society_id = visitors.society_id
    )
  )
  OR
  (
    EXISTS (
      SELECT 1 FROM public.flats 
      WHERE flats.id = visitors.flat_id 
      AND (flats.owner_id = auth.uid() OR flats.tenant_id = auth.uid())
    )
  )
);

-- 5. UPDATE:
-- Admins/Staff/Security can update any visitor in their society (Approval/Checkout)
-- Residents can update visitors for their own flats (Approval/Rejection)
CREATE POLICY "Visitors Update" ON public.visitors
FOR UPDATE TO authenticated
USING (
  (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE users.uid = auth.uid() 
      AND (users.role = 'admin' OR users.role = 'staff' OR users.role = 'security')
      AND users.society_id = visitors.society_id
    )
  )
  OR
  (
    EXISTS (
      SELECT 1 FROM public.flats 
      WHERE flats.id = visitors.flat_id 
      AND (flats.owner_id = auth.uid() OR flats.tenant_id = auth.uid())
    )
  )
)
WITH CHECK (
  (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE users.uid = auth.uid() 
      AND (users.role = 'admin' OR users.role = 'staff' OR users.role = 'security')
      AND users.society_id = visitors.society_id
    )
  )
  OR
  (
    EXISTS (
      SELECT 1 FROM public.flats 
      WHERE flats.id = visitors.flat_id 
      AND (flats.owner_id = auth.uid() OR flats.tenant_id = auth.uid())
    )
  )
);

-- 6. DELETE: Admins only
CREATE POLICY "Visitors Delete" ON public.visitors
FOR DELETE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE users.uid = auth.uid() 
    AND users.role = 'admin'
    AND users.society_id = visitors.society_id
  )
);
