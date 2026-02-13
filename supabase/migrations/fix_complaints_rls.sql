-- Fix: Allow Users (Owners/Tenants) to Register Complaints
-- Resetting RLS policies for complaints to ensure no blocks.

-- 1. Enable RLS
ALTER TABLE complaints ENABLE ROW LEVEL SECURITY;

-- 2. Drop existing policies
DROP POLICY IF EXISTS "Users can create own complaints" ON complaints;
DROP POLICY IF EXISTS "Users can read own complaints" ON complaints;
DROP POLICY IF EXISTS "Admins can manage society complaints" ON complaints;
DROP POLICY IF EXISTS "Allow authenticated insert complaint" ON complaints;

-- 3. Create Permissive/Correct Policies

-- ALLOW INSERT: Any authenticated user can raise a complaint.
-- We could restrict to "own society", but generally auth check + app logic is enough for Insert.
-- But let's be safe and allow any auth user to insert (RLS often checks the *new* row, 
-- and ensuring `user_id = auth.uid()` is good).
CREATE POLICY "Allow authenticated insert complaint" ON complaints
FOR INSERT TO authenticated
WITH CHECK (
    -- Allow if I am the user creating it
    user_id = auth.uid()
);

-- ALLOW SELECT: 
-- 1. Users can see their own complaints
-- 2. Admins can see all complaints in their society
CREATE POLICY "Users can read own complaints" ON complaints
FOR SELECT TO authenticated
USING (
    user_id = auth.uid() 
    OR 
    EXISTS (SELECT 1 FROM users WHERE uid = auth.uid() AND role IN ('admin', 'staff') AND society_id = complaints.society_id)
);

-- ALLOW UPDATE:
-- 1. Admins can update status/resolve
-- 2. Users?? Maybe update description if open? Let's just allow Admins for specific updates mostly.
--    But "Approve" etc is done by Admin.
CREATE POLICY "Admins can update complaints" ON complaints
FOR UPDATE TO authenticated
USING (
    EXISTS (SELECT 1 FROM users WHERE uid = auth.uid() AND role IN ('admin', 'staff') AND society_id = complaints.society_id)
);

-- ALLOW DELETE:
-- Admins only
CREATE POLICY "Admins can delete complaints" ON complaints
FOR DELETE TO authenticated
USING (
    EXISTS (SELECT 1 FROM users WHERE uid = auth.uid() AND role = 'admin' AND society_id = complaints.society_id)
);
