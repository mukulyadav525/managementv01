-- Allow society admins to insert user profiles for members of their society
-- Without this, registerByAdmin fails silently because the admin's uid != the new user's uid

-- Drop policy if exists to avoid conflict on re-run
DROP POLICY IF EXISTS "admins_can_insert_society_members" ON users;

CREATE POLICY "admins_can_insert_society_members" ON users
  FOR INSERT
  WITH CHECK (
    -- Allow if the inserting admin has role='admin' in the same society
    EXISTS (
      SELECT 1 FROM users AS admin_user
      WHERE admin_user.uid = auth.uid()
        AND admin_user.role = 'admin'
        AND admin_user.society_id = society_id  -- new row's society_id must match admin's society
    )
    OR auth.uid() = uid  -- original self-insert rule still works
  );
