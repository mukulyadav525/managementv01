-- Add profile_picture column to users table

ALTER TABLE users ADD COLUMN IF NOT EXISTS profile_picture TEXT;

-- Force Notify PostgREST to reload schema
NOTIFY pgrst, 'reload config';
