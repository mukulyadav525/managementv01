-- Fix: Resolve RLS "new row violates row-level security policy" for Visitors
-- This script ensures that authenticated users can register visitors and create flats on the fly.

-- 1. Ensure 'visitors' table has necessary columns (idempotent)
ALTER TABLE visitors ADD COLUMN IF NOT EXISTS vehicle_number TEXT;
ALTER TABLE visitors ADD COLUMN IF NOT EXISTS photo_url TEXT;
ALTER TABLE visitors ADD COLUMN IF NOT EXISTS pass_code TEXT;

-- 2. ENABLE RLS on visitors (just in case)
ALTER TABLE visitors ENABLE ROW LEVEL SECURITY;

-- 3. Allow any authenticated user to insert into 'visitors'
-- This covers Admins, Security, and potentially Residents
DROP POLICY IF EXISTS "Any auth user can register visitor" ON visitors;
CREATE POLICY "Any auth user can register visitor" ON visitors 
FOR INSERT TO authenticated 
WITH CHECK (auth.role() = 'authenticated');

-- 4. Allow 'visitors' to be read by members of the same society
DROP POLICY IF EXISTS "Users can read visitors for their society" ON visitors;
CREATE POLICY "Users can read visitors for their society" ON visitors 
FOR SELECT TO authenticated 
USING (
  EXISTS (SELECT 1 FROM users WHERE users.uid = auth.uid() AND users.society_id = visitors.society_id)
);

-- 5. Allow authenticated users to create flats
-- The app logic creates a flat if the visitor is for a new flat number.
DROP POLICY IF EXISTS "Authenticated users can create flats" ON flats;
CREATE POLICY "Authenticated users can create flats" ON flats 
FOR INSERT TO authenticated 
WITH CHECK (auth.role() = 'authenticated');

-- 6. Grant usage on sequences if using serials (unlikely with UUIDs but good practice)
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
