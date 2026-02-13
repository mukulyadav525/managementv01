-- SQL to setup Supabase Storage Buckets and RLS Policies
-- Run this in your Supabase SQL Editor to enable photo and document uploads.

-- 1. Create the buckets if they don't exist
INSERT INTO storage.buckets (id, name, public)
VALUES 
  ('documents', 'documents', true),
  ('kyc-documents', 'kyc-documents', false) -- KYC should be private
ON CONFLICT (id) DO NOTHING;

-- 2. Enable RLS on storage.objects (usually enabled by default)
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- 3. Set up Policies for 'documents' bucket (Visitor Photos)
-- Allow anyone to read visitor photos (Public)
DROP POLICY IF EXISTS "Public Access to Documents" ON storage.objects;
CREATE POLICY "Public Access to Documents" ON storage.objects
FOR SELECT USING (bucket_id = 'documents');

-- Allow authenticated users (Admins/Security) to upload to documents
DROP POLICY IF EXISTS "Auth Users can upload documents" ON storage.objects;
CREATE POLICY "Auth Users can upload documents" ON storage.objects
FOR INSERT TO authenticated WITH CHECK (bucket_id = 'documents');


-- 4. Set up Policies for 'kyc-documents' bucket (Private)
-- Only the user who uploaded the KYC can read it, or an Admin
DROP POLICY IF EXISTS "Users can read own KYC" ON storage.objects;
CREATE POLICY "Users can read own KYC" ON storage.objects
FOR SELECT TO authenticated
USING (
  bucket_id = 'kyc-documents' AND 
  (auth.uid()::text = (storage.foldername(name))[2] OR public.is_admin())
);

-- Allow authenticated users to upload KYC to their own folder
DROP POLICY IF EXISTS "Users can upload own KYC" ON storage.objects;
CREATE POLICY "Users can upload own KYC" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'kyc-documents' AND 
  auth.uid()::text = (storage.foldername(name))[2]
);

-- Note: (storage.foldername(name))[2] extracts the first subfolder after the bucket,
-- which we use as the user's UID in TenantKYC.tsx: `kyc/${user.uid}/...`
