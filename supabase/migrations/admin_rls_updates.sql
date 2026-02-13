-- 1. Create Helper Function to check Admin status safely (Avoiding recursion)
-- SECURITY DEFINER allows the function to bypass RLS on the users table
CREATE OR REPLACE FUNCTION is_admin_of_society(s_id TEXT)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM users 
    WHERE uid = auth.uid() 
    AND role = 'admin' 
    AND society_id = s_id
  );
$$ LANGUAGE sql SECURITY DEFINER;

-- 2. Create Vehicles Table
CREATE TABLE IF NOT EXISTS vehicles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  society_id TEXT REFERENCES societies(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(uid),
  flat_id TEXT REFERENCES flats(id) ON DELETE CASCADE,
  vehicle_number TEXT NOT NULL,
  v_type TEXT, -- 'car', 'bike', 'cycle', 'other'
  brand TEXT,
  model TEXT,
  parking_slot TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY;

-- 3. Admin "Supreme Power" Policies (Using Helper Function)

-- Users
DROP POLICY IF EXISTS "Admins can manage society users" ON users;
CREATE POLICY "Admins can manage society users" ON users 
FOR ALL USING (is_admin_of_society(society_id));

-- Societies
DROP POLICY IF EXISTS "Admins can update own society" ON societies;
CREATE POLICY "Admins can update own society" ON societies 
FOR UPDATE USING (is_admin_of_society(id));

-- Flats
DROP POLICY IF EXISTS "Admins can manage society flats" ON flats;
CREATE POLICY "Admins can manage society flats" ON flats 
FOR ALL USING (is_admin_of_society(society_id)) WITH CHECK (is_admin_of_society(society_id));

-- Payments
DROP POLICY IF EXISTS "Admins can manage society payments" ON payments;
CREATE POLICY "Admins can manage society payments" ON payments 
FOR ALL USING (is_admin_of_society(society_id)) WITH CHECK (is_admin_of_society(society_id));

-- Visitors
DROP POLICY IF EXISTS "Admins can manage society visitors" ON visitors;
CREATE POLICY "Admins can manage society visitors" ON visitors 
FOR ALL USING (is_admin_of_society(society_id)) WITH CHECK (is_admin_of_society(society_id));

-- Complaints
DROP POLICY IF EXISTS "Admins can manage society complaints" ON complaints;
CREATE POLICY "Admins can manage society complaints" ON complaints 
FOR ALL USING (is_admin_of_society(society_id)) WITH CHECK (is_admin_of_society(society_id));

-- Announcements
DROP POLICY IF EXISTS "Admins can manage society announcements" ON announcements;
CREATE POLICY "Admins can manage society announcements" ON announcements 
FOR ALL USING (is_admin_of_society(society_id)) WITH CHECK (is_admin_of_society(society_id));

-- Vehicles
DROP POLICY IF EXISTS "Admins can manage society vehicles" ON vehicles;
CREATE POLICY "Admins can manage society vehicles" ON vehicles 
FOR ALL USING (is_admin_of_society(society_id)) WITH CHECK (is_admin_of_society(society_id));

-- 4. General Read-Only Policies for Society Members
DROP POLICY IF EXISTS "Users can read society announcements" ON announcements;
CREATE POLICY "Users can read society announcements" ON announcements 
FOR SELECT USING (EXISTS (SELECT 1 FROM users WHERE uid = auth.uid() AND society_id = announcements.society_id));

DROP POLICY IF EXISTS "Users can read society vehicles" ON vehicles;
CREATE POLICY "Users can read society vehicles" ON vehicles 
FOR SELECT USING (EXISTS (SELECT 1 FROM users WHERE uid = auth.uid() AND society_id = vehicles.society_id));

DROP POLICY IF EXISTS "Users can read society flats" ON flats;
CREATE POLICY "Users can read society flats" ON flats 
FOR SELECT USING (EXISTS (SELECT 1 FROM users WHERE uid = auth.uid() AND society_id = flats.society_id));

DROP POLICY IF EXISTS "Users can manage own vehicles" ON vehicles;
CREATE POLICY "Users can manage own vehicles" ON vehicles 
FOR ALL USING (auth.uid() = user_id);
