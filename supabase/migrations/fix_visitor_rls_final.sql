-- Final RLS Fix: Reset and Simplify Policies for Visitors and Flats

-- 1. VISITORS TABLE POLICIES
-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Admins can manage society visitors" ON visitors;
DROP POLICY IF EXISTS "Any auth user can register visitor" ON visitors;
DROP POLICY IF EXISTS "Users can read visitors for their society" ON visitors;
DROP POLICY IF EXISTS "Users can read society visitors" ON visitors;

-- Enable RLS
ALTER TABLE visitors ENABLE ROW LEVEL SECURITY;

-- Add simple, reliable policies
-- Allow any authenticated user to INSERT a visitor (needed for Security/Admins)
CREATE POLICY "Allow authenticated insert visitor" ON visitors
FOR INSERT TO authenticated
WITH CHECK (true);

-- Allow users to SELECT visitors from their own society
CREATE POLICY "Allow read own society visitors" ON visitors
FOR SELECT TO authenticated
USING (
    society_id IN (
        SELECT society_id FROM users WHERE uid = auth.uid()
    )
);

-- Allow Admins to UPDATE/DELETE visitors in their society
CREATE POLICY "Allow admin update visitor" ON visitors
FOR UPDATE TO authenticated
USING (
    society_id IN (
        SELECT society_id FROM users WHERE uid = auth.uid() AND role = 'admin'
    )
);

CREATE POLICY "Allow admin delete visitor" ON visitors
FOR DELETE TO authenticated
USING (
    society_id IN (
        SELECT society_id FROM users WHERE uid = auth.uid() AND role = 'admin'
    )
);

-- 2. FLATS TABLE POLICIES
-- Drop existing policies
DROP POLICY IF EXISTS "Admins can manage society flats" ON flats;
DROP POLICY IF EXISTS "Authenticated users can create flats" ON flats;
DROP POLICY IF EXISTS "Users can read society flats" ON flats;
DROP POLICY IF EXISTS "Users can read flats in their society" ON flats;

-- Enable RLS
ALTER TABLE flats ENABLE ROW LEVEL SECURITY;

-- Add simple policies
-- Allow any authenticated user to create a flat (needed for on-the-fly creation)
CREATE POLICY "Allow authenticated insert flat" ON flats
FOR INSERT TO authenticated
WITH CHECK (true);

-- Allow users to SELECT flats in their society
CREATE POLICY "Allow read own society flats" ON flats
FOR SELECT TO authenticated
USING (
    society_id IN (
        SELECT society_id FROM users WHERE uid = auth.uid()
    )
);

-- Allow Admins to UPDATE/DELETE flats
CREATE POLICY "Allow admin update flat" ON flats
FOR UPDATE TO authenticated
USING (
    society_id IN (
        SELECT society_id FROM users WHERE uid = auth.uid() AND role = 'admin'
    )
);

CREATE POLICY "Allow admin delete flat" ON flats
FOR DELETE TO authenticated
USING (
    society_id IN (
        SELECT society_id FROM users WHERE uid = auth.uid() AND role = 'admin'
    )
);

-- 3. ENSURE COLUMNS EXIST (Just in case)
ALTER TABLE visitors ADD COLUMN IF NOT EXISTS vehicle_number TEXT;
ALTER TABLE visitors ADD COLUMN IF NOT EXISTS photo_url TEXT;
ALTER TABLE visitors ADD COLUMN IF NOT EXISTS pass_code TEXT;
