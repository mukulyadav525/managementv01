-- Add month column to payments table
ALTER TABLE payments ADD COLUMN IF NOT EXISTS month TEXT;

-- Rename user_id column to payer_id if we want to follow the frontend type, 
-- but actually it's better to keep user_id in DB and rename in frontend.
-- However, the user reported "failed to generate bill", which is usually a schema mismatch.
-- Let's stick to the current DB schema and fix the frontend.
