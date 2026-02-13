-- SQL to grant "Supreme Power" to Admins on all tables.
-- This fixes the issue where updates (like changing a flat's floor) were failing due to missing RLS policies.

-- 1. Ensure the is_admin() function exists (from previous fix)
CREATE OR REPLACE FUNCTION public.is_admin() 
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.users 
    WHERE uid = auth.uid() AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Add "Admin ALL" policies for all tables

-- Flats
DROP POLICY IF EXISTS "Admin can manage flats" ON public.flats;
CREATE POLICY "Admin can manage flats" ON public.flats
FOR ALL TO authenticated 
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- Visitors
DROP POLICY IF EXISTS "Admin can manage visitors" ON public.visitors;
CREATE POLICY "Admin can manage visitors" ON public.visitors
FOR ALL TO authenticated 
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- Payments
DROP POLICY IF EXISTS "Admin can manage payments" ON public.payments;
CREATE POLICY "Admin can manage payments" ON public.payments
FOR ALL TO authenticated 
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- Complaints
DROP POLICY IF EXISTS "Admin can manage complaints" ON public.complaints;
CREATE POLICY "Admin can manage complaints" ON public.complaints
FOR ALL TO authenticated 
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- Announcements
DROP POLICY IF EXISTS "Admin can manage announcements" ON public.announcements;
CREATE POLICY "Admin can manage announcements" ON public.announcements
FOR ALL TO authenticated 
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- Societies
DROP POLICY IF EXISTS "Admin can manage societies" ON public.societies;
CREATE POLICY "Admin can manage societies" ON public.societies
FOR ALL TO authenticated 
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- Vehicles
DROP POLICY IF EXISTS "Admin can manage vehicles" ON public.vehicles;
CREATE POLICY "Admin can manage vehicles" ON public.vehicles
FOR ALL TO authenticated 
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- 3. Also grant Security role some permissions if needed (Optional)
-- Security can UPDATE visitors (for checkout)
DROP POLICY IF EXISTS "Security can update visitors" ON public.visitors;
CREATE POLICY "Security can update visitors" ON public.visitors
FOR UPDATE TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.users WHERE uid = auth.uid() AND role = 'security')
);

-- Note: SELECT policies already exist for most tables, these will add UPDATE/DELETE/INSERT power.
