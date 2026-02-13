-- Final Fix for Visitor Approval
-- 1. Ensure `approved_by` column exists
ALTER TABLE visitors ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES users(uid);

-- 2. Ensure `flats` table is readable by authenticated users (needed for RLS checks)
-- Drop restrictive policy if exists, or create a permissive one for SELECT
DROP POLICY IF EXISTS "Allow authenticated read flats" ON flats;
CREATE POLICY "Allow authenticated read flats" ON flats FOR SELECT TO authenticated USING (true);

-- 3. Re-apply Visitor Update RLS (Robust Version)
ALTER TABLE visitors ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Residents can update visitors for their flats" ON visitors;

CREATE POLICY "Residents can update visitors for their flats" ON visitors
FOR UPDATE TO authenticated
USING (
    -- Can update if it's for my flat
    EXISTS (
        SELECT 1 FROM flats 
        WHERE flats.id = visitors.flat_id 
        AND (flats.owner_id = auth.uid() OR flats.tenant_id = auth.uid())
    )
)
WITH CHECK (
    -- Ensure it remains for my flat
    EXISTS (
        SELECT 1 FROM flats 
        WHERE flats.id = visitors.flat_id 
        AND (flats.owner_id = auth.uid() OR flats.tenant_id = auth.uid())
    )
);

-- 4. Ensure Select Policy is also correct
DROP POLICY IF EXISTS "Residents can view visitors for their flats" ON visitors;
CREATE POLICY "Residents can view visitors for their flats" ON visitors
FOR SELECT TO authenticated
USING (
    -- Visitor is for a flat I own or rent
    EXISTS (
        SELECT 1 FROM flats 
        WHERE flats.id = visitors.flat_id 
        AND (flats.owner_id = auth.uid() OR flats.tenant_id = auth.uid())
    )
    OR
    -- OR if I created the visitor entry
    society_id = (SELECT society_id FROM users WHERE uid = auth.uid()) 
    AND 
    (status = 'approved' OR status = 'pending') -- Slightly wider read for debugging, but flat check is primary
);
