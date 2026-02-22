-- FIX AMENITY BOOKING RLS & PERMISSIONS
-- 1. Add missing UPDATE and DELETE policies for users on their own bookings
-- 2. Allow Security and Admin roles to manage all bookings in their society

-- Step 1: Cleanup old policies to avoid conflicts
DROP POLICY IF EXISTS "user_read_own_bookings" ON public.amenity_bookings;
DROP POLICY IF EXISTS "user_insert_own_bookings" ON public.amenity_bookings;
DROP POLICY IF EXISTS "admin_manage_society_bookings" ON public.amenity_bookings;
DROP POLICY IF EXISTS "user_manage_own_bookings" ON public.amenity_bookings;

-- Step 2: Create robust policies

-- A. Users can view their own bookings
CREATE POLICY "user_read_own_bookings" ON public.amenity_bookings
    FOR SELECT TO authenticated
    USING (user_id = auth.uid());

-- B. Users can create their own bookings (matching their society)
CREATE POLICY "user_insert_own_bookings" ON public.amenity_bookings
    FOR INSERT TO authenticated
    WITH CHECK (user_id = auth.uid());

-- C. Users can UPDATE (e.g., cancel) their own bookings
CREATE POLICY "user_update_own_bookings" ON public.amenity_bookings
    FOR UPDATE TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- D. Users can DELETE their own bookings (if needed)
CREATE POLICY "user_delete_own_bookings" ON public.amenity_bookings
    FOR DELETE TO authenticated
    USING (user_id = auth.uid());

-- E. Admins and Security can manage ALL bookings in their society
CREATE POLICY "management_manage_society_bookings" ON public.amenity_bookings
    FOR ALL TO authenticated
    USING (
        (public.check_user_role(ARRAY['admin', 'security']))
        AND public.check_user_society(society_id)
    );

-- Reload Schema Cache
NOTIFY pgrst, 'reload schema';
