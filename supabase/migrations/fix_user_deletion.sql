-- SQL to fix "Database error deleting user" by adding ON DELETE CASCADE
-- This allows deleting users from Supabase Auth dashboard safely

-- 1. Update public.users to cascade from auth.users
ALTER TABLE public.users 
DROP CONSTRAINT IF EXISTS users_uid_fkey,
ADD CONSTRAINT users_uid_fkey 
  FOREIGN KEY (uid) 
  REFERENCES auth.users(id) 
  ON DELETE CASCADE;

-- 2. Ensure flats table has the correct columns before adding constraints
ALTER TABLE public.flats 
ADD COLUMN IF NOT EXISTS owner_id UUID REFERENCES public.users(uid),
ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.users(uid);

-- Update flats to cascade from users
ALTER TABLE public.flats
DROP CONSTRAINT IF EXISTS flats_owner_id_fkey,
DROP CONSTRAINT IF EXISTS flats_tenant_id_fkey,
ADD CONSTRAINT flats_owner_id_fkey 
  FOREIGN KEY (owner_id) 
  REFERENCES public.users(uid) 
  ON DELETE SET NULL, -- Better to keep flat record, just remove owner
ADD CONSTRAINT flats_tenant_id_fkey 
  FOREIGN KEY (tenant_id) 
  REFERENCES public.users(uid) 
  ON DELETE SET NULL; -- Better to keep flat record, just remove tenant

-- 3. Update payments to cascade from users
ALTER TABLE public.payments
DROP CONSTRAINT IF EXISTS payments_user_id_fkey,
ADD CONSTRAINT payments_user_id_fkey 
  FOREIGN KEY (user_id) 
  REFERENCES public.users(uid) 
  ON DELETE CASCADE;

-- 4. Update complaints to cascade from users
ALTER TABLE public.complaints
DROP CONSTRAINT IF EXISTS complaints_user_id_fkey,
ADD CONSTRAINT complaints_user_id_fkey 
  FOREIGN KEY (user_id) 
  REFERENCES public.users(uid) 
  ON DELETE CASCADE;

-- 5. Update announcements to cascade from users
ALTER TABLE public.announcements
DROP CONSTRAINT IF EXISTS announcements_created_by_fkey,
ADD CONSTRAINT announcements_created_by_fkey 
  FOREIGN KEY (created_by) 
  REFERENCES public.users(uid) 
  ON DELETE CASCADE;

-- 6. Update vehicles to cascade from users (if exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'vehicles') THEN
    ALTER TABLE public.vehicles
    DROP CONSTRAINT IF EXISTS vehicles_user_id_fkey,
    ADD CONSTRAINT vehicles_user_id_fkey 
      FOREIGN KEY (user_id) 
      REFERENCES public.users(uid) 
      ON DELETE CASCADE;
  END IF;
END $$;
