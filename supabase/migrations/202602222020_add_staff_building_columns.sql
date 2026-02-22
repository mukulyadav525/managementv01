-- Add building_id and building_ids columns to users table
-- to support both legacy single-select and new multi-select building assignments for staff.

ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS building_id TEXT,
ADD COLUMN IF NOT EXISTS building_ids TEXT[] DEFAULT '{}';

-- Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';
