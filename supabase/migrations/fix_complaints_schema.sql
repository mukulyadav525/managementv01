-- Fix: Add images column to complaints table and create complaints storage bucket

-- 1. Add images column to complaints table if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'complaints' AND column_name = 'images') THEN
        ALTER TABLE complaints ADD COLUMN images TEXT[];
    END IF;
END $$;

-- 2. Create 'complaints' bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('complaints', 'complaints', true)
ON CONFLICT (id) DO NOTHING;

-- 3. Set up RLS policies for 'complaints' bucket

-- Allow public read access to complaint images
DROP POLICY IF EXISTS "Public Access to Complaint Images" ON storage.objects;
CREATE POLICY "Public Access to Complaint Images" ON storage.objects
FOR SELECT USING (bucket_id = 'complaints');

-- Allow authenticated users to upload images to complaints bucket
DROP POLICY IF EXISTS "Authenticated Users can upload complaint images" ON storage.objects;
CREATE POLICY "Authenticated Users can upload complaint images" ON storage.objects
FOR INSERT TO authenticated WITH CHECK (bucket_id = 'complaints');

-- Allow users to delete their own complaint images (optional, but good practice)
DROP POLICY IF EXISTS "Users can delete own complaint images" ON storage.objects;
CREATE POLICY "Users can delete own complaint images" ON storage.objects
FOR DELETE TO authenticated USING (bucket_id = 'complaints' AND auth.uid()::text = (storage.foldername(name))[2]);
