-- Fix infinite recursion on users table RLS
-- The "security_view_society_members" policy references users table from within itself

-- 1. Drop the problematic policy
DROP POLICY IF EXISTS "security_view_society_members" ON public.users;

-- 2. Create a SECURITY DEFINER function to safely get current user's society_id
-- This bypasses RLS, preventing recursion
CREATE OR REPLACE FUNCTION get_my_society_id()
RETURNS TEXT AS $$
  SELECT society_id FROM public.users WHERE uid = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER;

-- 3. Recreate the policy using the safe function
CREATE POLICY "society_members_can_view_each_other" ON public.users
FOR SELECT TO authenticated
USING (
    society_id = get_my_society_id()
);

-- Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';
