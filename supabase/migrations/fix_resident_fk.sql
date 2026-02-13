-- SQL to fix the "Foreign Key Constraint" error when adding residents
-- AND fix the "Infinite Recursion" error in RLS policies.

-- 1. Remove the strict foreign key constraint from public.users
-- This allows Admins to create resident profiles even before they have a Supabase Auth account.
ALTER TABLE public.users 
DROP CONSTRAINT IF EXISTS users_uid_fkey;

-- 2. Create a SECURITY DEFINER function to check for Admin role
-- This bypasses RLS and prevents infinite recursion when checking roles.
CREATE OR REPLACE FUNCTION public.is_admin() 
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.users 
    WHERE uid = auth.uid() AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Drop the problematic recursive policy
DROP POLICY IF EXISTS "Admin can manage all users" ON public.users;

-- 4. Re-create the policy using the safe function
CREATE POLICY "Admin can manage all users" ON public.users
FOR ALL 
TO authenticated
USING (public.is_admin());

-- 5. Ensure other policies don't conflict (Optional but good for robustness)
-- The original SELECT policy for "own profile" is fine:
-- CREATE POLICY "Users can read own profile" ON users FOR SELECT USING (auth.uid() = uid);
