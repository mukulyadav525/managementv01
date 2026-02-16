-- Add bank_details column to users and societies tables

-- For Users (Residents/Owners/Staff)
ALTER TABLE users ADD COLUMN IF NOT EXISTS bank_details JSONB DEFAULT '{}';

-- For Societies (Admin management)
ALTER TABLE societies ADD COLUMN IF NOT EXISTS bank_details JSONB DEFAULT '{}';

-- Notify PostgREST to reload schema cache
NOTIFY pgrst, 'reload schema';
