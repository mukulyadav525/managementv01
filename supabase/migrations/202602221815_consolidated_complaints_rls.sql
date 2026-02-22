-- Consolidated RLS for Complaints table
-- Owners/Tenants: See own complaints
-- Admins/Staff/Security: See all in society

-- 1. Enable RLS
ALTER TABLE complaints ENABLE ROW LEVEL SECURITY;

-- 2. Drop all existing policies to avoid conflicts
DROP POLICY IF EXISTS "Users can read own complaints" ON complaints;
DROP POLICY IF EXISTS "Users can create own complaints" ON complaints;
DROP POLICY IF EXISTS "Allow authenticated insert complaint" ON complaints;
DROP POLICY IF EXISTS "Admins can update complaints" ON complaints;
DROP POLICY IF EXISTS "Admins can delete complaints" ON complaints;

-- 3. Create consolidated SELECT policy
CREATE POLICY "Role-based select complaints" ON complaints
FOR SELECT TO authenticated
USING (
    -- User is the owner of the complaint
    user_id = auth.uid() 
    OR 
    -- User is Admin, Staff, or Security in the same society
    EXISTS (
        SELECT 1 FROM users 
        WHERE users.uid = auth.uid() 
        AND users.role IN ('admin', 'staff', 'security') 
        AND users.society_id = complaints.society_id
    )
);

-- 4. Create consolidated INSERT policy
CREATE POLICY "Auth users can insert complaints" ON complaints
FOR INSERT TO authenticated
WITH CHECK (
    -- Ensure the user_id matches the authenticated user
    user_id = auth.uid()
);

-- 5. Create consolidated UPDATE policy
CREATE POLICY "Role-based update complaints" ON complaints
FOR UPDATE TO authenticated
USING (
    -- Admins, Staff, and Security can update status/resolution details
    EXISTS (
        SELECT 1 FROM users 
        WHERE users.uid = auth.uid() 
        AND users.role IN ('admin', 'staff', 'security') 
        AND users.society_id = complaints.society_id
    )
    OR
    -- Owner can update their own complaint if it's still 'open'
    (user_id = auth.uid() AND status = 'open')
);

-- 6. Create consolidated DELETE policy
CREATE POLICY "Admins can delete complaints" ON complaints
FOR DELETE TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM users 
        WHERE users.uid = auth.uid() 
        AND users.role = 'admin' 
        AND users.society_id = complaints.society_id
    )
);
