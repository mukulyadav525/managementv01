-- Fix: Allow owners to insert and update tenant records for their flats

-- Drop existing policies if they match by name (cleanup)
DROP POLICY IF EXISTS "owners_insert_tenants" ON users;
DROP POLICY IF EXISTS "owners_update_tenants" ON users;

-- Owners can INSERT tenants if the tenant is assigned to a flat the owner owns
CREATE POLICY "owners_insert_tenants" ON users
    FOR INSERT
    WITH CHECK (
        role = 'tenant' AND
        EXISTS (
            SELECT 1 FROM flats
            WHERE flats.owner_id = auth.uid()
            AND flats.id = ANY(users.flat_ids)
        )
    );

-- Owners can UPDATE tenants if the tenant is assigned to a flat the owner owns
CREATE POLICY "owners_update_tenants" ON users
    FOR UPDATE
    USING (
        role = 'tenant' AND
        EXISTS (
            SELECT 1 FROM flats
            WHERE flats.owner_id = auth.uid()
            AND flats.id = ANY(users.flat_ids)
        )
    );

-- Also ensure flats tenant_id and occupancy can be updated by owners
DROP POLICY IF EXISTS "owners_update_owned_flats" ON flats;
CREATE POLICY "owners_update_owned_flats" ON flats
    FOR UPDATE
    USING (owner_id = auth.uid());

-- Notify PostgREST to reload the schema
NOTIFY pgrst, 'reload schema';
