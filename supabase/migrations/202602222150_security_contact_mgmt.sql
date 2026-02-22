-- Allow security role to manage emergency contacts
DROP POLICY IF EXISTS "Admins can manage contacts" ON emergency_contacts;

CREATE POLICY "Admins and security can manage contacts" ON emergency_contacts
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.uid = auth.uid() 
            AND users.role IN ('admin', 'security')
            AND users.society_id = emergency_contacts.society_id
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.uid = auth.uid() 
            AND users.role IN ('admin', 'security')
            AND users.society_id = emergency_contacts.society_id
        )
    );
