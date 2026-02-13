-- SQL to add missing columns to the visitors table
-- Run this in your Supabase SQL Editor to fix visitor and vehicle registration

-- Add vehicle_number column to visitors table
ALTER TABLE public.visitors ADD COLUMN IF NOT EXISTS vehicle_number TEXT;

-- Add photo_url column to visitors table (for visitor photos)
ALTER TABLE public.visitors ADD COLUMN IF NOT EXISTS photo_url TEXT;

-- Add pass_code column if it doesn't exist (for entry passes)
ALTER TABLE public.visitors ADD COLUMN IF NOT EXISTS pass_code TEXT;

-- Refresh the PostgREST schema cache to pick up the changes
NOTIFY pgrst, 'reload schema';
