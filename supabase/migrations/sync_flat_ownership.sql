-- Complete fix for flat ownership synchronization
-- This includes both immediate sync and automatic future sync via triggers

-- PART 1: Sync existing data
-- Update all users' flat_ids array based on which flats they own
UPDATE users
SET flat_ids = (
    SELECT ARRAY_AGG(flats.id)
    FROM flats
    WHERE flats.owner_id = users.uid
)
WHERE role = 'owner'
AND EXISTS (
    SELECT 1 FROM flats WHERE flats.owner_id = users.uid
);

-- Also update tenant flat_ids
UPDATE users
SET flat_ids = (
    SELECT ARRAY_AGG(flats.id)
    FROM flats
    WHERE flats.tenant_id = users.uid
)
WHERE role = 'tenant'
AND EXISTS (
    SELECT 1 FROM flats WHERE flats.tenant_id = users.uid
);

-- Clear flat_ids for users who don't own/rent any flats
UPDATE users
SET flat_ids = ARRAY[]::TEXT[]
WHERE flat_ids IS NOT NULL
AND NOT EXISTS (
    SELECT 1 FROM flats 
    WHERE (flats.owner_id = users.uid AND users.role = 'owner')
    OR (flats.tenant_id = users.uid AND users.role = 'tenant')
);

-- PART 2: Create trigger function to auto-sync in the future
CREATE OR REPLACE FUNCTION sync_user_flat_ids()
RETURNS TRIGGER AS $$
BEGIN
    -- When a flat's owner_id changes, update the owner's flat_ids
    IF (TG_OP = 'UPDATE' AND OLD.owner_id IS DISTINCT FROM NEW.owner_id) OR TG_OP = 'INSERT' THEN
        -- Remove flat from old owner's flat_ids
        IF OLD.owner_id IS NOT NULL THEN
            UPDATE users
            SET flat_ids = ARRAY_REMOVE(flat_ids, OLD.id)
            WHERE uid = OLD.owner_id;
        END IF;
        
        -- Add flat to new owner's flat_ids
        IF NEW.owner_id IS NOT NULL THEN
            UPDATE users
            SET flat_ids = ARRAY_APPEND(
                COALESCE(flat_ids, ARRAY[]::TEXT[]),
                NEW.id
            )
            WHERE uid = NEW.owner_id
            AND NOT (NEW.id = ANY(COALESCE(flat_ids, ARRAY[]::TEXT[])));
        END IF;
    END IF;
    
    -- When a flat's tenant_id changes, update the tenant's flat_ids
    IF (TG_OP = 'UPDATE' AND OLD.tenant_id IS DISTINCT FROM NEW.tenant_id) OR TG_OP = 'INSERT' THEN
        -- Remove flat from old tenant's flat_ids
        IF OLD.tenant_id IS NOT NULL THEN
            UPDATE users
            SET flat_ids = ARRAY_REMOVE(flat_ids, OLD.id)
            WHERE uid = OLD.tenant_id;
        END IF;
        
        -- Add flat to new tenant's flat_ids
        IF NEW.tenant_id IS NOT NULL THEN
            UPDATE users
            SET flat_ids = ARRAY_APPEND(
                COALESCE(flat_ids, ARRAY[]::TEXT[]),
                NEW.id
            )
            WHERE uid = NEW.tenant_id
            AND NOT (NEW.id = ANY(COALESCE(flat_ids, ARRAY[]::TEXT[])));
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if it exists
DROP TRIGGER IF EXISTS sync_flat_ownership_trigger ON flats;

-- Create trigger
CREATE TRIGGER sync_flat_ownership_trigger
AFTER INSERT OR UPDATE ON flats
FOR EACH ROW
EXECUTE FUNCTION sync_user_flat_ids();

-- Verify the sync worked
SELECT 
    u.name,
    u.email,
    u.role,
    u.flat_ids,
    (SELECT ARRAY_AGG(f.flat_number) FROM flats f WHERE f.id = ANY(u.flat_ids)) as flat_numbers
FROM users u
WHERE u.role IN ('owner', 'tenant')
ORDER BY u.role, u.name;
