-- Create kyc-documents bucket if not exists
INSERT INTO storage.buckets (id, name, public)
VALUES ('kyc-documents', 'kyc-documents', true)
ON CONFLICT (id) DO NOTHING;

-- Policy: Give authenticated users access to the bucket
CREATE POLICY "Public Access"
ON storage.objects FOR SELECT
USING ( bucket_id = 'kyc-documents' );

CREATE POLICY "Auth Users Can Upload KYC"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'kyc-documents'
  AND auth.role() = 'authenticated'
);

CREATE POLICY "Users can update own KYC"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'kyc-documents'
  AND auth.uid()::text = (storage.foldername(name))[2]
);

CREATE POLICY "Users can delete own KYC"
ON storage.objects FOR DELETE
USING (
    bucket_id = 'kyc-documents'
    AND auth.uid()::text = (storage.foldername(name))[2]
);
