-- Allow users to see other users in the same society
-- This is necessary for owners to assign tenants who already exist in the system

DROP POLICY IF EXISTS "society_members_select_each_other" ON users;

CREATE POLICY "society_members_select_each_other" ON users
FOR SELECT TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM users AS current_user
        WHERE current_user.uid = auth.uid()
        AND current_user.society_id = users.society_id
    )
);

-- Notify PostgREST to reload the schema
NOTIFY pgrst, 'reload schema';
