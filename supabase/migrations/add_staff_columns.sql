-- Add staff_type and staff_role to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS staff_type TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS staff_role TEXT;

-- Update existing staff members to have a default staff_type if they don't have one
-- This is just to ensure consistency if some data already exists
UPDATE users SET staff_type = 'society_staff' WHERE role = 'staff' AND staff_type IS NULL;

-- Enable public read for these columns (already covered by existing RLS but good to keep in mind)
-- Ensure PostgREST reloads its schema cache
NOTIFY pgrst, 'reload config';
