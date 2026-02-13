-- 1. Check current counts to see if data exists but is hidden
SELECT count(*) FROM flats;
SELECT count(*) FROM users WHERE role = 'admin';

-- 2. Verify society_id correlation
SELECT society_id, count(*) FROM flats GROUP BY society_id;
SELECT society_id, count(*) FROM users GROUP BY society_id;

-- 3. Simplified, More Robust RLS Policies
-- Use a direct join instead of a security definer function if possible, 
-- or ensure the function is extremely robust.

CREATE OR REPLACE FUNCTION is_admin_of_society(s_id TEXT)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM users 
    WHERE uid = auth.uid() 
    AND role = 'admin' 
    AND (society_id = s_id OR s_id IS NULL)
  );
$$ LANGUAGE sql SECURITY DEFINER;

-- Re-apply Flat policies with table alias for clarity
DROP POLICY IF EXISTS "Admins can manage society flats" ON flats;
CREATE POLICY "Admins can manage society flats" ON flats 
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM users 
    WHERE users.uid = auth.uid() 
    AND users.role = 'admin' 
    AND users.society_id = flats.society_id
  )
) WITH CHECK (
  EXISTS (
    SELECT 1 FROM users 
    WHERE users.uid = auth.uid() 
    AND users.role = 'admin' 
    AND users.society_id = flats.society_id
  )
);

-- Backup policy for authenticated users in the same society
DROP POLICY IF EXISTS "Users can read society flats" ON flats;
CREATE POLICY "Users can read society flats" ON flats 
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM users 
    WHERE users.uid = auth.uid() 
    AND users.society_id = flats.society_id
  )
);
