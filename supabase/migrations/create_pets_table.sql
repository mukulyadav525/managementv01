-- Create Pets Table
-- 🛠️ Instructions: Run this in the Supabase SQL Editor.

CREATE TABLE IF NOT EXISTS public.pets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    society_id TEXT NOT NULL,
    flat_id UUID REFERENCES public.flats(id) ON DELETE CASCADE,
    owner_id UUID REFERENCES public.users(uid) ON DELETE CASCADE,
    name TEXT NOT NULL,
    type TEXT NOT NULL, -- e.g., 'Dog', 'Cat', 'Bird'
    breed TEXT,
    vaccination_status TEXT DEFAULT 'pending', -- 'pending', 'vaccinated'
    vaccination_date DATE,
    photo_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.pets ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "member_read_pets" ON public.pets;
DROP POLICY IF EXISTS "resident_manage_own_pets" ON public.pets;
DROP POLICY IF EXISTS "admin_manage_all_pets" ON public.pets;

-- 1. Members of society can read all pets in the society
CREATE POLICY "member_read_pets" ON public.pets
    FOR SELECT USING (
        public.check_user_society(society_id)
    );

-- 2. Residents can manage (INSERT, UPDATE, DELETE) their own pets
-- For INSERT, we check if the user belongs to the flat they are adding a pet to
CREATE POLICY "resident_manage_own_pets" ON public.pets
    FOR ALL USING (
        auth.uid() = owner_id OR 
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE uid = auth.uid() AND flat_id = pets.flat_id
        )
    );

-- 3. Admins can manage all pets in their society
CREATE POLICY "admin_manage_all_pets" ON public.pets
    FOR ALL USING (
        public.check_is_admin(society_id)
    );

-- Reload schema
NOTIFY pgrst, 'reload schema';
