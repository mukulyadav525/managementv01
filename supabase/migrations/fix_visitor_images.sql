-- Fix: Ensure 'documents' bucket exists and has correct policies for Visitor Photos

-- 1. Create 'documents' bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('documents', 'documents', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- 2. Set up RLS policies for 'documents' bucket

-- Allow public read access to documents (visitor photos)
DROP POLICY IF EXISTS "Public Access to Documents" ON storage.objects;
CREATE POLICY "Public Access to Documents" ON storage.objects
FOR SELECT USING (bucket_id = 'documents');

-- Allow authenticated users to upload images to documents bucket
DROP POLICY IF EXISTS "Authenticated Users can upload documents" ON storage.objects;
CREATE POLICY "Authenticated Users can upload documents" ON storage.objects
FOR INSERT TO authenticated WITH CHECK (bucket_id = 'documents');

-- Allow users to delete their own uploads (optional)
DROP POLICY IF EXISTS "Users can delete own documents" ON storage.objects;
CREATE POLICY "Users can delete own documents" ON storage.objects
FOR DELETE TO authenticated USING (bucket_id = 'documents' AND auth.uid()::text = (storage.foldername(name))[2]);
