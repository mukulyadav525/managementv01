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
CREATE POLICY "Users can read society announcements" ON announcements FOR SELECT USING (
  EXISTS (SELECT 1 FROM users WHERE users.uid = auth.uid() AND users.society_id = announcements.society_id)
);
