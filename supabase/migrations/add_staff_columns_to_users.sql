-- Add staff_type and staff_role columns to users table if they don't exist
-- These store the kind of staff member (security, maintenance, etc.)

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS staff_type TEXT,
  ADD COLUMN IF NOT EXISTS staff_role TEXT;
