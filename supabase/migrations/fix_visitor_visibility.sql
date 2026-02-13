-- Fix Visitor Visibility RLS (Strict Access)

-- 1. Enable RLS (just in case)
ALTER TABLE visitors ENABLE ROW LEVEL SECURITY;

-- 2. Drop existing permissive policies
DROP POLICY IF EXISTS "Residents can view visitors for their flats" ON visitors;
DROP POLICY IF EXISTS "Users can read visitors for their society" ON visitors; 
-- (Drop any other potential read policies)

-- 3. Create Strict Policy for SELECT
CREATE POLICY "Strict Visitor Visibility" ON visitors
FOR SELECT TO authenticated
USING (
  -- 1. Admins and Staff can see all visitors in their society
  (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.uid = auth.uid() 
      AND (users.role = 'admin' OR users.role = 'staff')
      AND users.society_id = visitors.society_id
    )
  )
  OR
  -- 2. Residents (Owners/Tenants) can see visitors ONLY for their flats
  (
    EXISTS (
      SELECT 1 FROM flats 
      WHERE flats.id = visitors.flat_id 
      AND (
        flats.owner_id = auth.uid() 
        OR flats.tenant_id = auth.uid()
        -- Also check flat_ids array for secondary tenants/residents if applicable
        OR flats.id = ANY(
            SELECT UNNEST(flat_ids) FROM users WHERE uid = auth.uid()
        )
      )
    )
  )
);
