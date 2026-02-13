-- Add missing columns to visitors table
ALTER TABLE visitors ADD COLUMN IF NOT EXISTS pass_code TEXT;
ALTER TABLE visitors ADD COLUMN IF NOT EXISTS photo_url TEXT;
ALTER TABLE visitors ADD COLUMN IF NOT EXISTS floor INTEGER;

-- Update RLS for visitors to ensure pass_code is readable
-- (Assuming existing select policy allows society members to see records)
