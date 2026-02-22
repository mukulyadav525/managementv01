-- Migration: Add House-specific occupancy tracking columns
-- Note: Applies to the "flats" table (which acts generically as units across both Towers and Houses)

-- 1. Total floors for validation constraint checks
ALTER TABLE flats 
ADD COLUMN IF NOT EXISTS total_floors INTEGER;

-- 2. House owner occupancy status mapping
ALTER TABLE flats
ADD COLUMN IF NOT EXISTS owner_lives_in_house BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS owner_floor_number INTEGER;

-- 3. Dynamic tenant storage mapping (JSONB structure: {"floorNumber": "tenantUserId"})
ALTER TABLE flats
ADD COLUMN IF NOT EXISTS tenants_by_floor JSONB DEFAULT '{}'::jsonb;
