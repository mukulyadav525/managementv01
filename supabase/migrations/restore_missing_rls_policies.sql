-- 🚀 CONSOLIDATED FEATURE SETUP (TABLES + RLS)
-- This script creates the missing tables for Amenities, Polls, Documents, and Emergency Contacts
-- AND sets up the correct RLS policies for the RBAC system.

-- ==========================================
-- 1. CREATE MISSING TABLES
-- ==========================================

-- Amenities Table
CREATE TABLE IF NOT EXISTS amenities (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  society_id TEXT REFERENCES societies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  location TEXT,
  capacity INTEGER,
  booking_type TEXT DEFAULT 'slot', -- 'slot', 'full_day'
  rules TEXT[],
  image_url TEXT,
  status TEXT DEFAULT 'available', -- 'available', 'maintenance', 'closed'
  price_per_hour DECIMAL(10, 2) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Amenity Bookings Table
CREATE TABLE IF NOT EXISTS amenity_bookings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  amenity_id UUID REFERENCES amenities(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(uid),
  society_id TEXT REFERENCES societies(id) ON DELETE CASCADE,
  flat_id TEXT REFERENCES flats(id) ON DELETE CASCADE,
  start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  end_time TIMESTAMP WITH TIME ZONE NOT NULL,
  status TEXT DEFAULT 'confirmed', -- 'pending', 'confirmed', 'cancelled', 'completed'
  total_price DECIMAL(10, 2),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Emergency Contacts Table
CREATE TABLE IF NOT EXISTS emergency_contacts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  society_id TEXT REFERENCES societies(id) ON DELETE CASCADE,
  category TEXT NOT NULL, -- 'emergency', 'society', 'medical', 'essential'
  name TEXT NOT NULL,
  role TEXT,
  phone TEXT NOT NULL,
  phone2 TEXT,
  email TEXT,
  description TEXT,
  is_verified BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Polls Table
CREATE TABLE IF NOT EXISTS polls (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  society_id TEXT REFERENCES societies(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT, -- 'financial', 'event', 'general'
  status TEXT DEFAULT 'active', -- 'active', 'closed'
  ends_at TIMESTAMP WITH TIME ZONE,
  created_by UUID REFERENCES users(uid),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Poll Options Table
CREATE TABLE IF NOT EXISTS poll_options (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  poll_id UUID REFERENCES polls(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  order_index INTEGER DEFAULT 0
);

-- Poll Votes Table
CREATE TABLE IF NOT EXISTS poll_votes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  poll_id UUID REFERENCES polls(id) ON DELETE CASCADE,
  option_id UUID REFERENCES poll_options(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(uid),
  flat_id TEXT REFERENCES flats(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(poll_id, user_id)
);

-- Documents Table
CREATE TABLE IF NOT EXISTS documents (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  society_id TEXT REFERENCES societies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  category TEXT NOT NULL, -- 'society', 'personal'
  doc_type TEXT, -- 'PDF', 'Image', etc.
  file_size TEXT,
  file_url TEXT NOT NULL,
  is_public BOOLEAN DEFAULT false,
  uploaded_by UUID REFERENCES users(uid),
  owner_id UUID REFERENCES users(uid), -- For personal docs
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==========================================
-- 2. ENABLE RLS
-- ==========================================
ALTER TABLE public.amenities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.amenity_bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.emergency_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.polls ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.poll_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.poll_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

-- ==========================================
-- 3. RESTORE RLS POLICIES (Using helpers from strict_rbac.sql)
-- ==========================================

-- Amenities
CREATE POLICY "member_read_amenities" ON public.amenities
    FOR SELECT USING (public.check_user_society(society_id));

CREATE POLICY "admin_manage_amenities" ON public.amenities
    FOR ALL USING (public.check_is_admin(society_id));

-- Amenity Bookings
CREATE POLICY "user_read_own_bookings" ON public.amenity_bookings
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "user_insert_own_bookings" ON public.amenity_bookings
    FOR INSERT TO authenticated
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "admin_manage_society_bookings" ON public.amenity_bookings
    FOR ALL USING (public.check_is_admin(society_id));

-- Emergency Contacts
CREATE POLICY "member_read_emergency_contacts" ON public.emergency_contacts
    FOR SELECT USING (public.check_user_society(society_id));

CREATE POLICY "admin_manage_emergency_contacts" ON public.emergency_contacts
    FOR ALL USING (public.check_is_admin(society_id));

-- Polls
CREATE POLICY "member_read_polls" ON public.polls
    FOR SELECT USING (public.check_user_society(society_id));

CREATE POLICY "admin_manage_polls" ON public.polls
    FOR ALL USING (public.check_is_admin(society_id));

-- Poll Options
CREATE POLICY "member_read_poll_options" ON public.poll_options
    FOR SELECT USING (true); -- Public if you can see the poll

CREATE POLICY "admin_manage_poll_options" ON public.poll_options
    FOR ALL USING (true);

-- Poll Votes
CREATE POLICY "user_read_own_poll_votes" ON public.poll_votes
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "user_cast_poll_vote" ON public.poll_votes
    FOR INSERT TO authenticated
    WITH CHECK (user_id = auth.uid());

-- Documents
CREATE POLICY "member_read_documents" ON public.documents
    FOR SELECT USING (
        (category = 'society' AND public.check_user_society(society_id)) OR
        (category = 'personal' AND owner_id = auth.uid())
    );

CREATE POLICY "user_upload_documents" ON public.documents
    FOR INSERT TO authenticated
    WITH CHECK (
        (category = 'personal' AND owner_id = auth.uid()) OR
        (category = 'society' AND public.check_is_admin(society_id))
    );

CREATE POLICY "user_manage_own_documents" ON public.documents
    FOR ALL USING (
        (category = 'personal' AND owner_id = auth.uid()) OR
        (category = 'society' AND public.check_is_admin(society_id))
    );

-- Reload Schema Cache
NOTIFY pgrst, 'reload schema';
