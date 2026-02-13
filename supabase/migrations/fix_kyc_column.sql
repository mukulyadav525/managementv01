-- Fix missing kyc_documents column in users table

-- 1. Add the column if it doesn't exist
ALTER TABLE users ADD COLUMN IF NOT EXISTS kyc_documents JSONB DEFAULT '{}';

-- 2. Force Notify PostgREST to reload schema
NOTIFY pgrst, 'reload config';
