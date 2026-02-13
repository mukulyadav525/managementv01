-- Tenant Management Enhancement SQL Script

-- 1. Create rent_agreements table
CREATE TABLE IF NOT EXISTS rent_agreements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  flat_id TEXT REFERENCES flats(id) ON DELETE CASCADE,
  tenant_id UUID REFERENCES users(uid) ON DELETE CASCADE,
  owner_id UUID REFERENCES users(uid) ON DELETE CASCADE,
  start_date DATE NOT NULL,
  end_date DATE,
  monthly_rent DECIMAL(12,2),
  security_deposit DECIMAL(12,2),
  agreement_document TEXT,
  status TEXT DEFAULT 'active',
  terms JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Add new columns to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS move_in_date DATE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS emergency_contact JSONB DEFAULT '{}';

-- 3. Add new columns to payments table
ALTER TABLE payments ADD COLUMN IF NOT EXISTS month TEXT;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS receipt_url TEXT;

-- 4. Enable RLS on rent_agreements
ALTER TABLE rent_agreements ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies for rent_agreements

-- Owners can view their rent agreements
CREATE POLICY "Owners can view their rent agreements" ON rent_agreements
  FOR SELECT USING (
    auth.uid() = owner_id OR auth.uid() = tenant_id
  );

-- Owners can create rent agreements
CREATE POLICY "Owners can create rent agreements" ON rent_agreements
  FOR INSERT WITH CHECK (auth.uid() = owner_id);

-- Owners can update their rent agreements
CREATE POLICY "Owners can update their rent agreements" ON rent_agreements
  FOR UPDATE USING (auth.uid() = owner_id);

-- Owners can delete their rent agreements
CREATE POLICY "Owners can delete their rent agreements" ON rent_agreements
  FOR DELETE USING (auth.uid() = owner_id);

-- 6. Create storage bucket for rent agreements
INSERT INTO storage.buckets (id, name, public)
VALUES ('rent-agreements', 'rent-agreements', false)
ON CONFLICT (id) DO UPDATE SET public = false;

-- 7. Storage RLS policies for rent-agreements bucket
CREATE POLICY "Users can upload rent agreements"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'rent-agreements' AND
  auth.role() = 'authenticated'
);

CREATE POLICY "Users can view their rent agreements"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'rent-agreements' AND
  auth.role() = 'authenticated'
);

CREATE POLICY "Users can update their rent agreements"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'rent-agreements' AND
  auth.role() = 'authenticated'
);

CREATE POLICY "Users can delete their rent agreements"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'rent-agreements' AND
  auth.role() = 'authenticated'
);

-- Force Notify PostgREST to reload schema
NOTIFY pgrst, 'reload config';
