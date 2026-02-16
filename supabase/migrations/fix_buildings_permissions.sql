-- FINAL FIX FOR BUILDINGS TABLE AND RLS
-- 🛠️ Instructions: Run this in the Supabase SQL Editor.

-- 1. Create Buildings Table (if missing)
CREATE TABLE IF NOT EXISTS public.buildings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    society_id TEXT NOT NULL,
    name TEXT NOT NULL,
    total_floors INTEGER DEFAULT 1,
    total_flats INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(society_id, name)
);

-- 2. Ensure RLS is enabled
ALTER TABLE public.buildings ENABLE ROW LEVEL SECURITY;

-- 3. Drop existing policies to consolidate
DROP POLICY IF EXISTS "member_read_buildings" ON public.buildings;
DROP POLICY IF EXISTS "admin_manage_buildings" ON public.buildings;
DROP POLICY IF EXISTS "Users can read buildings in their society" ON public.buildings;

-- 4. Create policies using existing SECURITY DEFINER helpers (from strict_rbac.sql)

-- Policy: Members can read buildings in their society
CREATE POLICY "member_read_buildings" ON public.buildings
    FOR SELECT USING (
        public.check_user_society(society_id)
    );

-- Policy: Admins can manage buildings in their society
CREATE POLICY "admin_manage_buildings" ON public.buildings
    FOR ALL USING (
        public.check_is_admin(society_id)
    );

-- 5. Force schema reload
NOTIFY pgrst, 'reload schema';
