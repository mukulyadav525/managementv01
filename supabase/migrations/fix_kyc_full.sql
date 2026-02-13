-- Comprehensive Fix for KYC Uploads
-- This script fixes both the Storage Bucket permissions AND the Users table permissions.

-- PART 1: STORAGE BUCKET
-- Ensure bucket exists and is public
INSERT INTO storage.buckets (id, name, public)
VALUES ('kyc-documents', 'kyc-documents', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Remove valid policies to start fresh (avoids conflicts)
DROP POLICY IF EXISTS "Public Access" ON storage.objects;
DROP POLICY IF EXISTS "Auth Users Can Upload KYC" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own KYC" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own KYC" ON storage.objects;
-- Also drop potentially conflicting old policies if any
DROP POLICY IF EXISTS "Give users access to own folder 1ok1r8a_0" ON storage.objects;
DROP POLICY IF EXISTS "Give users access to own folder 1ok1r8a_1" ON storage.objects;
DROP POLICY IF EXISTS "Give users access to own folder 1ok1r8a_2" ON storage.objects;
DROP POLICY IF EXISTS "Give users access to own folder 1ok1r8a_3" ON storage.objects;

-- Create correct policies
-- 1. Anyone can view (public bucket behavior)
CREATE POLICY "Public Access" ON storage.objects FOR SELECT 
USING ( bucket_id = 'kyc-documents' );

-- 2. Authenticated users can upload NEW files
CREATE POLICY "Auth Users Can Upload KYC" ON storage.objects FOR INSERT 
WITH CHECK ( bucket_id = 'kyc-documents' AND auth.role() = 'authenticated' );

-- 3. Users can update/delete their OWN files (based on folder structure: kyc/USER_ID/filename)
CREATE POLICY "Users can update own KYC" ON storage.objects FOR UPDATE
USING ( bucket_id = 'kyc-documents' AND auth.uid()::text = (storage.foldername(name))[2] );

CREATE POLICY "Users can delete own KYC" ON storage.objects FOR DELETE
USING ( bucket_id = 'kyc-documents' AND auth.uid()::text = (storage.foldername(name))[2] );


-- PART 2: USERS TABLE PERMISSIONS
-- The upload process involves updating the 'users' table (kyc_documents column).
-- We must ensure the user has permission to UPDATE their own row.

ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Ensure an update policy exists
DROP POLICY IF EXISTS "Users can update kyc data" ON users;
CREATE POLICY "Users can update kyc data" ON users FOR UPDATE 
USING (auth.uid() = uid);

-- (Optional) Ensure Select exists too, though usually present
DROP POLICY IF EXISTS "Users can read own profile" ON users;
CREATE POLICY "Users can read own profile" ON users FOR SELECT 
USING (auth.uid() = uid);
