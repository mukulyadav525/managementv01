-- Add residence fields to users table to support staff living in the society
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS resides_in_society BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS home_building_id TEXT,
ADD COLUMN IF NOT EXISTS home_flat_id TEXT;
