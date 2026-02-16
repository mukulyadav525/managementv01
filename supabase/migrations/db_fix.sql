-- Run this in your Supabase SQL Editor to fix the Payments table

-- Add missing columns to payments table
ALTER TABLE payments ADD COLUMN IF NOT EXISTS fine_amount DECIMAL(10, 2) DEFAULT 0;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS fine_reason TEXT;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS month TEXT;

-- Notify PostgREST to reload schema cache
NOTIFY pgrst, 'reload schema';
