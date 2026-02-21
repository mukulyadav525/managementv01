-- 1. Create Users Table
CREATE TABLE IF NOT EXISTS users (
  uid UUID REFERENCES auth.users NOT NULL PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  phone TEXT,
  role TEXT DEFAULT 'tenant',
  society_id TEXT,
  flat_ids TEXT[], -- Array of flat identifiers
  status TEXT DEFAULT 'active',
  kyc_documents JSONB DEFAULT '{}', -- Store URLs for Aadhar, etc.
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Create Societies Table
CREATE TABLE IF NOT EXISTS societies (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  address JSONB,
  total_flats INTEGER,
  total_buildings INTEGER,
  contact_email TEXT,
  contact_phone TEXT,
  amenities TEXT[],
  settings JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Create Flats Table
CREATE TABLE IF NOT EXISTS flats (
  id TEXT PRIMARY KEY,
  society_id TEXT REFERENCES societies(id) ON DELETE CASCADE,
  building_id TEXT,
  flat_number TEXT NOT NULL,
  floor INTEGER,
  bhk_type TEXT,
  area INTEGER,
  occupancy_status TEXT DEFAULT 'vacant',
  owner_id UUID REFERENCES users(uid),
  tenant_id UUID REFERENCES users(uid),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Create Payments Table
CREATE TABLE IF NOT EXISTS payments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  society_id TEXT REFERENCES societies(id) ON DELETE CASCADE,
  flat_id TEXT REFERENCES flats(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(uid),
  amount DECIMAL(12, 2) NOT NULL,
  type TEXT, -- 'rent', 'maintenance', 'water', 'electricity', 'other'
  status TEXT DEFAULT 'pending', -- 'pending', 'paid', 'failed'
  due_date TIMESTAMP WITH TIME ZONE,
  paid_date TIMESTAMP WITH TIME ZONE,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Create Visitors Table
CREATE TABLE IF NOT EXISTS visitors (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  society_id TEXT REFERENCES societies(id) ON DELETE CASCADE,
  flat_id TEXT REFERENCES flats(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  phone TEXT,
  purpose TEXT,
  v_type TEXT, -- 'guest', 'delivery', 'service'
  status TEXT DEFAULT 'entered', -- 'entered', 'exited'
  entry_time TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  exit_time TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. Create Complaints Table
CREATE TABLE IF NOT EXISTS complaints (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  society_id TEXT REFERENCES societies(id) ON DELETE CASCADE,
  flat_id TEXT REFERENCES flats(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(uid),
  title TEXT NOT NULL,
  description TEXT,
  category TEXT,
  priority TEXT DEFAULT 'medium',
  status TEXT DEFAULT 'open', -- 'open', 'in_progress', 'resolved', 'closed'
  resolution_notes TEXT,
  resolved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. Create Announcements Table
CREATE TABLE IF NOT EXISTS announcements (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  society_id TEXT REFERENCES societies(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  category TEXT, -- 'event', 'maintenance', 'general'
  priority TEXT DEFAULT 'normal',
  created_by UUID REFERENCES users(uid),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security (RLS)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE societies ENABLE ROW LEVEL SECURITY;

ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE visitors ENABLE ROW LEVEL SECURITY;
ALTER TABLE complaints ENABLE ROW LEVEL SECURITY;
ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;

-- Basic Policies
-- Users
CREATE POLICY "Users can read own profile" ON users FOR SELECT USING (auth.uid() = uid);
CREATE POLICY "Users can insert own profile" ON users FOR INSERT WITH CHECK (auth.uid() = uid);
CREATE POLICY "Users can update own profile" ON users FOR UPDATE USING (auth.uid() = uid);

-- Societies
CREATE POLICY "Public read societies" ON societies FOR SELECT USING (true);
CREATE POLICY "Authenticated users can create societies" ON societies FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Flats
ALTER TABLE flats ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read flats in their society" ON flats FOR SELECT USING (
  EXISTS (SELECT 1 FROM users WHERE users.uid = auth.uid() AND users.society_id = flats.society_id)
);
CREATE POLICY "Authenticated users can create flats" ON flats FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Payments
CREATE POLICY "Users can read own payments" ON payments FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Authenticated users can insert payments" ON payments FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Visitors
CREATE POLICY "Users can read visitors for their society" ON visitors FOR SELECT USING (
  EXISTS (SELECT 1 FROM users WHERE users.uid = auth.uid() AND users.society_id = visitors.society_id)
);
CREATE POLICY "Any auth user can register visitor" ON visitors FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Complaints
CREATE POLICY "Users can read own complaints" ON complaints FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own complaints" ON complaints FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Announcements
-- 8. Create Amenities Table
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

-- 9. Create Amenity Bookings Table
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

-- 10. Create Emergency Contacts Table
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

-- 11. Create Polls Table
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

-- 11a. Create Poll Options Table
CREATE TABLE IF NOT EXISTS poll_options (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  poll_id UUID REFERENCES polls(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  order_index INTEGER DEFAULT 0
);

-- 11b. Create Poll Votes Table
CREATE TABLE IF NOT EXISTS poll_votes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  poll_id UUID REFERENCES polls(id) ON DELETE CASCADE,
  option_id UUID REFERENCES poll_options(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(uid),
  flat_id TEXT REFERENCES flats(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(poll_id, user_id) -- One vote per user per poll
);

-- 12. Create Documents Table
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

-- Enable RLS for new tables
ALTER TABLE amenities ENABLE ROW LEVEL SECURITY;
ALTER TABLE amenity_bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE emergency_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE polls ENABLE ROW LEVEL SECURITY;
ALTER TABLE poll_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE poll_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

-- Policies for new tables

-- Amenities
CREATE POLICY "Users can read society amenities" ON amenities FOR SELECT USING (
  EXISTS (SELECT 1 FROM users WHERE users.uid = auth.uid() AND users.society_id = amenities.society_id)
);
CREATE POLICY "Admins can manage amenities" ON amenities FOR ALL USING (
  EXISTS (SELECT 1 FROM users WHERE users.uid = auth.uid() AND users.role = 'admin' AND users.society_id = amenities.society_id)
);

-- Amenity Bookings
CREATE POLICY "Users can read own bookings" ON amenity_bookings FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create bookings" ON amenity_bookings FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Admins can read society bookings" ON amenity_bookings FOR SELECT USING (
  EXISTS (SELECT 1 FROM users WHERE users.uid = auth.uid() AND users.role = 'admin' AND users.society_id = amenity_bookings.society_id)
);

-- Emergency Contacts
CREATE POLICY "Users can read society contacts" ON emergency_contacts FOR SELECT USING (
  EXISTS (SELECT 1 FROM users WHERE users.uid = auth.uid() AND users.society_id = emergency_contacts.society_id)
);
CREATE POLICY "Admins can manage contacts" ON emergency_contacts FOR ALL USING (
  EXISTS (SELECT 1 FROM users WHERE users.uid = auth.uid() AND users.role = 'admin' AND users.society_id = emergency_contacts.society_id)
);

-- Polls
CREATE POLICY "Users can read society polls" ON polls FOR SELECT USING (
  EXISTS (SELECT 1 FROM users WHERE users.uid = auth.uid() AND users.society_id = polls.society_id)
);
CREATE POLICY "Admins can manage polls" ON polls FOR ALL USING (
  EXISTS (SELECT 1 FROM users WHERE users.uid = auth.uid() AND users.role = 'admin' AND users.society_id = polls.society_id)
);

-- Poll Options (Same as polls)
CREATE POLICY "Users can read poll options" ON poll_options FOR SELECT USING (true);
CREATE POLICY "Admins can manage poll options" ON poll_options FOR ALL USING (true); -- Simplification for now

-- Poll Votes
CREATE POLICY "Users can read poll votes" ON poll_votes FOR SELECT USING (
  EXISTS (SELECT 1 FROM users WHERE users.uid = auth.uid() AND users.society_id = (SELECT society_id FROM polls WHERE polls.id = poll_votes.poll_id))
);
CREATE POLICY "Users can cast votes" ON poll_votes FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Documents
CREATE POLICY "Users can read society documents" ON documents FOR SELECT USING (
  (category = 'society' AND EXISTS (SELECT 1 FROM users WHERE users.uid = auth.uid() AND users.society_id = documents.society_id)) OR
  (category = 'personal' AND auth.uid() = owner_id)
);
CREATE POLICY "Users can upload personal docs" ON documents FOR INSERT WITH CHECK (
  (category = 'personal' AND auth.uid() = owner_id) OR
  (category = 'society' AND EXISTS (SELECT 1 FROM users WHERE users.uid = auth.uid() AND users.role = 'admin'))
);
CREATE POLICY "Admins can manage society docs" ON documents FOR ALL USING (
  category = 'society' AND EXISTS (SELECT 1 FROM users WHERE users.uid = auth.uid() AND users.role = 'admin')
);
