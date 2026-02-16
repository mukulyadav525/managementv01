-- Fix Buildings RLS and Allow Admin Management
-- 🛠️ Instructions: Run this in the Supabase SQL Editor.

-- 1. Ensure RLS is enabled
ALTER TABLE IF EXISTS public.buildings ENABLE ROW LEVEL SECURITY;

-- 2. Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Users can read buildings in their society" ON public.buildings;
DROP POLICY IF EXISTS "member_read_buildings" ON public.buildings;
DROP POLICY IF EXISTS "admin_manage_buildings" ON public.buildings;

-- 3. Create robust policies using the security definer helpers (if they exist)
-- Note: Re-using the pattern from strict_rbac.sql

-- Policy for reading (Members of society)
CREATE POLICY "member_read_buildings" ON public.buildings
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE uid = auth.uid() AND society_id = buildings.society_id
        )
    );

-- Policy for full management (Admins of society)
CREATE POLICY "admin_manage_buildings" ON public.buildings
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE uid = auth.uid() AND role = 'admin' AND society_id = buildings.society_id
        )
    );

-- 4. Reload schema notification
NOTIFY pgrst, 'reload schema';
