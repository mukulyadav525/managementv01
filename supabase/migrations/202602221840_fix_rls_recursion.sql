-- Helper function to get current user's society_id without recursion
CREATE OR REPLACE FUNCTION get_my_society_id()
RETURNS TEXT AS $$
  SELECT society_id FROM users WHERE uid = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER;

-- Update the society visibility policy to use the non-recursive helper
DROP POLICY IF EXISTS "society_members_select_each_other" ON users;

CREATE POLICY "society_members_select_each_other" ON users
FOR SELECT TO authenticated
USING (
    society_id = get_my_society_id()
);

-- Notify PostgREST to reload the schema
NOTIFY pgrst, 'reload schema';
