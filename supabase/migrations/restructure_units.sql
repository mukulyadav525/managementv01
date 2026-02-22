-- Restructure for Tower vs House Societies

-- 1. Add society_type to societies table
ALTER TABLE societies ADD COLUMN IF NOT EXISTS society_type TEXT DEFAULT 'tower';

-- 2. Add unit_type to flats table
ALTER TABLE flats ADD COLUMN IF NOT EXISTS unit_type TEXT DEFAULT 'flat';

-- Notify PostgREST to reload schema
NOTIFY pgrst, 'reload schema';
