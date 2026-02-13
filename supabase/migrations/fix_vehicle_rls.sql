-- Fix: Restrict Vehicle Management RLS
-- Use 'nuke and pave' approach for vehicles table policies as well to ensure clean slate.

-- 1. Enable RLS
ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY;

-- 2. Drop existing policies
DROP POLICY IF EXISTS "Admins can manage society vehicles" ON vehicles;
DROP POLICY IF EXISTS "Users can read society vehicles" ON vehicles;
DROP POLICY IF EXISTS "Users can manage own vehicles" ON vehicles;
DROP POLICY IF EXISTS "Allow authenticated insert vehicle" ON vehicles;
DROP POLICY IF EXISTS "Allow read own society vehicles" ON vehicles;

-- 3. Create Strict Policies

-- ADMINS (Superuser access for their society)
CREATE POLICY "Admins can do everything on vehicles" ON vehicles
FOR ALL TO authenticated
USING (
    EXISTS (SELECT 1 FROM users WHERE uid = auth.uid() AND role = 'admin' AND society_id = vehicles.society_id)
);

-- OWNERS (Can manage vehicles linked to flats they OWN)
CREATE POLICY "Owners can manage vehicles for their flats" ON vehicles
FOR ALL TO authenticated
USING (
    -- Access if the vehicle belongs to a flat I own
    EXISTS (
        SELECT 1 FROM flats 
        WHERE flats.id = vehicles.flat_id 
        AND flats.owner_id = auth.uid()
    )
)
WITH CHECK (
    -- Allow insert/update only if the vehicle is being linked to a flat I own
    EXISTS (
        SELECT 1 FROM flats 
        WHERE flats.id = vehicles.flat_id 
        AND flats.owner_id = auth.uid()
    )
);

-- RESIDENTS (Tenants/Owners) - Can manage their OWN personal vehicles
-- This covers users adding a vehicle for themselves even if RLS above misses it (e.g. tenant adding update)
-- But primarily, the Owner's policy handles the main request. 
-- We'll allow users to view/edit vehicles where THEY are the registered user_id.
CREATE POLICY "Users can manage their own assigned vehicles" ON vehicles
FOR ALL TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- READ ONLY for Society? 
-- The user said "no other car/bike can be manged by any other perons"
-- Explicitly DID NOT say "seen". But usually, security needs to see lists.
-- We'll add a specific Read policy for Security role if needed, but for now, 
-- let's keep it strict: You only see what you own/manage. 
-- Wait, "Track resident vehicles" implies visibility.
-- I'll allow SELECT for everyone in the society, but MODIFY only for Owners/Admins/Self.
CREATE POLICY "Everyone can see society vehicles" ON vehicles
FOR SELECT TO authenticated
USING (society_id = (SELECT society_id FROM users WHERE uid = auth.uid()));
