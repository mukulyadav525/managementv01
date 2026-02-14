-- populate_db.sql
-- 🚀 Purpose: Populate the database with 2 societies and comprehensive sample data.
-- 🛠️ Instructions: Run this script in the Supabase SQL Editor.

-- Enable pgcrypto if not already enabled
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1. CLEANUP (Optional - uncomment if you want a fresh start)
-- DELETE FROM auth.users WHERE email LIKE '%@grandview.com' OR email LIKE '%@skyline.com' OR email = 'admin@gmail.com';
-- DELETE FROM societies WHERE id IN ('SOC001', 'SOC002');

-- 2. CREATE SOCIETIES
INSERT INTO societies (id, name, address, total_flats, total_buildings, contact_email, contact_phone, amenities, settings, created_at, updated_at)
VALUES 
(
  'SOC001',
  'Grand View Apartments',
  '{"street": "Plot 45, Sector 18", "area": "Nerul", "city": "Navi Mumbai", "state": "Maharashtra", "pincode": "400706"}'::JSONB,
  120,
  4,
  'admin@grandview.com',
  '+91 9820011223',
  ARRAY['Gym', 'Pool', 'Clubhouse', 'Children Play Area', '24/7 Security']::TEXT[],
  '{"maintenanceDay": 10, "latePaymentPenalty": 250, "visitorApprovalRequired": true}'::JSONB,
  NOW(),
  NOW()
),
(
  'SOC002',
  'Skyline Residency',
  '{"street": "Skyline Heights, MG Road", "area": "Kharadi", "city": "Pune", "state": "Maharashtra", "pincode": "411014"}'::JSONB,
  80,
  2,
  'admin@skyline.com',
  '+91 9850022334',
  ARRAY['Power Backup', 'Terrace Garden', 'Smart Security', 'Gym']::TEXT[],
  '{"maintenanceDay": 5, "latePaymentPenalty": 150, "visitorApprovalRequired": true}'::JSONB,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;

-- 3. CREATE USERS (Auth and Public Profiles)
-- Helper function to create user safely if possible in SQL Editor
-- Note: Supabase SQL Editor doesn't allow direct auth.users creation easily without valid schema access.
-- We will use raw SQL for profiles. 
-- IMPORTANT: The user MUST still add these users via Authentication tab or I will attempt to insert into auth.users.
-- Most Supabase projects allow postgres role to insert into auth.users.

DO $$
DECLARE
  pwd_hash TEXT := crypt('admin123', gen_salt('bf'));
  grandview_admin_id UUID := gen_random_uuid();
  grandview_owner_id UUID := gen_random_uuid();
  grandview_tenant_id UUID := gen_random_uuid();
  grandview_staff_id UUID := gen_random_uuid();
  grandview_guard_id UUID := gen_random_uuid();
  skyline_admin_id UUID := gen_random_uuid();
  skyline_owner_id UUID := gen_random_uuid();
  skyline_tenant_id UUID := gen_random_uuid();
  skyline_staff_id UUID := gen_random_uuid();
  skyline_guard_id UUID := gen_random_uuid();
  main_admin_id UUID := gen_random_uuid();
BEGIN
  -- Insert into auth.users (Using SELECT WHERE NOT EXISTS for better reliability)
  INSERT INTO auth.users (id, instance_id, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, is_super_admin, role, aud)
  SELECT main_admin_id, '00000000-0000-0000-0000-000000000000', 'admin@gmail.com', pwd_hash, NOW(), '{"provider":"email","providers":["email"]}', '{"name":"Super Admin"}', FALSE, 'authenticated', 'authenticated'
  WHERE NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'admin@gmail.com');

  INSERT INTO auth.users (id, instance_id, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, is_super_admin, role, aud)
  SELECT grandview_admin_id, '00000000-0000-0000-0000-000000000000', 'admin1@grandview.com', pwd_hash, NOW(), '{"provider":"email","providers":["email"]}', '{"name":"Grandview Admin"}', FALSE, 'authenticated', 'authenticated'
  WHERE NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'admin1@grandview.com');

  INSERT INTO auth.users (id, instance_id, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, is_super_admin, role, aud)
  SELECT grandview_owner_id, '00000000-0000-0000-0000-000000000000', 'owner1@grandview.com', pwd_hash, NOW(), '{"provider":"email","providers":["email"]}', '{"name":"Amit Sharma"}', FALSE, 'authenticated', 'authenticated'
  WHERE NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'owner1@grandview.com');

  INSERT INTO auth.users (id, instance_id, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, is_super_admin, role, aud)
  SELECT grandview_tenant_id, '00000000-0000-0000-0000-000000000000', 'tenant1@grandview.com', pwd_hash, NOW(), '{"provider":"email","providers":["email"]}', '{"name":"Rahul Gupta"}', FALSE, 'authenticated', 'authenticated'
  WHERE NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'tenant1@grandview.com');

  INSERT INTO auth.users (id, instance_id, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, is_super_admin, role, aud)
  SELECT grandview_staff_id, '00000000-0000-0000-0000-000000000000', 'staff1@grandview.com', pwd_hash, NOW(), '{"provider":"email","providers":["email"]}', '{"name":"Suresh Manager"}', FALSE, 'authenticated', 'authenticated'
  WHERE NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'staff1@grandview.com');

  INSERT INTO auth.users (id, instance_id, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, is_super_admin, role, aud)
  SELECT grandview_guard_id, '00000000-0000-0000-0000-000000000000', 'guard1@grandview.com', pwd_hash, NOW(), '{"provider":"email","providers":["email"]}', '{"name":"Bahadur Singh"}', FALSE, 'authenticated', 'authenticated'
  WHERE NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'guard1@grandview.com');

  INSERT INTO auth.users (id, instance_id, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, is_super_admin, role, aud)
  SELECT skyline_admin_id, '00000000-0000-0000-0000-000000000000', 'admin2@skyline.com', pwd_hash, NOW(), '{"provider":"email","providers":["email"]}', '{"name":"Skyline Admin"}', FALSE, 'authenticated', 'authenticated'
  WHERE NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'admin2@skyline.com');

  INSERT INTO auth.users (id, instance_id, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, is_super_admin, role, aud)
  SELECT skyline_owner_id, '00000000-0000-0000-0000-000000000000', 'owner2@skyline.com', pwd_hash, NOW(), '{"provider":"email","providers":["email"]}', '{"name":"Vikram Rao"}', FALSE, 'authenticated', 'authenticated'
  WHERE NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'owner2@skyline.com');

  INSERT INTO auth.users (id, instance_id, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, is_super_admin, role, aud)
  SELECT skyline_tenant_id, '00000000-0000-0000-0000-000000000000', 'tenant2@skyline.com', pwd_hash, NOW(), '{"provider":"email","providers":["email"]}', '{"name":"Priya Nair"}', FALSE, 'authenticated', 'authenticated'
  WHERE NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'tenant2@skyline.com');

  INSERT INTO auth.users (id, instance_id, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, is_super_admin, role, aud)
  SELECT skyline_staff_id, '00000000-0000-0000-0000-000000000000', 'staff2@skyline.com', pwd_hash, NOW(), '{"provider":"email","providers":["email"]}', '{"name":"Deepak Staff"}', FALSE, 'authenticated', 'authenticated'
  WHERE NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'staff2@skyline.com');

  INSERT INTO auth.users (id, instance_id, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, is_super_admin, role, aud)
  SELECT skyline_guard_id, '00000000-0000-0000-0000-000000000000', 'guard2@skyline.com', pwd_hash, NOW(), '{"provider":"email","providers":["email"]}', '{"name":"Ramesh Guard"}', FALSE, 'authenticated', 'authenticated'
  WHERE NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'guard2@skyline.com');

  -- Insert into public.users (Profiles)
  -- We fetch the IDs back just in case they already existed
  INSERT INTO public.users (uid, email, name, phone, role, society_id, status)
  SELECT id, email, (raw_user_meta_data->>'name'), '9000000000', 'admin', 'SOC001', 'active' FROM auth.users WHERE email = 'admin@gmail.com'
  ON CONFLICT (uid) DO NOTHING;
  
  INSERT INTO public.users (uid, email, name, phone, role, society_id, status)
  SELECT id, email, (raw_user_meta_data->>'name'), '9100000001', 'admin', 'SOC001', 'active' FROM auth.users WHERE email = 'admin1@grandview.com'
  ON CONFLICT (uid) DO NOTHING;

  INSERT INTO public.users (uid, email, name, phone, role, society_id, status)
  SELECT id, email, (raw_user_meta_data->>'name'), '9200000001', 'owner', 'SOC001', 'active' FROM auth.users WHERE email = 'owner1@grandview.com'
  ON CONFLICT (uid) DO NOTHING;

  INSERT INTO public.users (uid, email, name, phone, role, society_id, status)
  SELECT id, email, (raw_user_meta_data->>'name'), '9300000001', 'tenant', 'SOC001', 'active' FROM auth.users WHERE email = 'tenant1@grandview.com'
  ON CONFLICT (uid) DO NOTHING;

  INSERT INTO public.users (uid, email, name, phone, role, society_id, status)
  SELECT id, email, (raw_user_meta_data->>'name'), '9400000001', 'staff', 'SOC001', 'active' FROM auth.users WHERE email = 'staff1@grandview.com'
  ON CONFLICT (uid) DO NOTHING;

  INSERT INTO public.users (uid, email, name, phone, role, society_id, status)
  SELECT id, email, (raw_user_meta_data->>'name'), '9500000001', 'security', 'SOC001', 'active' FROM auth.users WHERE email = 'guard1@grandview.com'
  ON CONFLICT (uid) DO NOTHING;

  -- Society 2
  INSERT INTO public.users (uid, email, name, phone, role, society_id, status)
  SELECT id, email, (raw_user_meta_data->>'name'), '9100000002', 'admin', 'SOC002', 'active' FROM auth.users WHERE email = 'admin2@skyline.com'
  ON CONFLICT (uid) DO NOTHING;

  INSERT INTO public.users (uid, email, name, phone, role, society_id, status)
  SELECT id, email, (raw_user_meta_data->>'name'), '9200000002', 'owner', 'SOC002', 'active' FROM auth.users WHERE email = 'owner2@skyline.com'
  ON CONFLICT (uid) DO NOTHING;

  INSERT INTO public.users (uid, email, name, phone, role, society_id, status)
  SELECT id, email, (raw_user_meta_data->>'name'), '9300000002', 'tenant', 'SOC002', 'active' FROM auth.users WHERE email = 'tenant2@skyline.com'
  ON CONFLICT (uid) DO NOTHING;

  INSERT INTO public.users (uid, email, name, phone, role, society_id, status)
  SELECT id, email, (raw_user_meta_data->>'name'), '9400000002', 'staff', 'SOC002', 'active' FROM auth.users WHERE email = 'staff2@skyline.com'
  ON CONFLICT (uid) DO NOTHING;

  INSERT INTO public.users (uid, email, name, phone, role, society_id, status)
  SELECT id, email, (raw_user_meta_data->>'name'), '9500000002', 'security', 'SOC002', 'active' FROM auth.users WHERE email = 'guard2@skyline.com'
  ON CONFLICT (uid) DO NOTHING;

END $$;

-- 4. CREATE FLATS
INSERT INTO flats (id, society_id, building_id, flat_number, floor, bhk_type, area, occupancy_status, owner_id)
SELECT 'FLAT101-GV', 'SOC001', 'A', '101', 1, '2BHK', 1200, 'owner-occupied', uid FROM users WHERE email = 'owner1@grandview.com'
ON CONFLICT (id) DO NOTHING;

INSERT INTO flats (id, society_id, building_id, flat_number, floor, bhk_type, area, occupancy_status, owner_id, tenant_id)
SELECT 'FLAT102-GV', 'SOC001', 'A', '102', 1, '3BHK', 1500, 'rented', (SELECT uid FROM users WHERE email = 'owner1@grandview.com'), (SELECT uid FROM users WHERE email = 'tenant1@grandview.com')
ON CONFLICT (id) DO NOTHING;

INSERT INTO flats (id, society_id, building_id, flat_number, floor, bhk_type, area, occupancy_status, owner_id)
SELECT 'FLAT101-SL', 'SOC002', '1', '101', 1, '2BHK', 1100, 'owner-occupied', uid FROM users WHERE email = 'owner2@skyline.com'
ON CONFLICT (id) DO NOTHING;

-- 5. UPDATE USER FLAT ASSOCIATIONS
UPDATE users SET flat_ids = ARRAY['FLAT101-GV', 'FLAT102-GV'] WHERE email = 'owner1@grandview.com';
UPDATE users SET flat_ids = ARRAY['FLAT102-GV'] WHERE email = 'tenant1@grandview.com';
UPDATE users SET flat_ids = ARRAY['FLAT101-SL'] WHERE email = 'owner2@skyline.com';

-- 6. ADD OTHER RECORDS
-- Announcements
INSERT INTO announcements (society_id, title, content, category, priority, created_by)
SELECT 'SOC001', 'Annual General Meeting', 'The AGM will be held on Sunday at 10 AM in the clubhouse.', 'general', 'high', uid FROM users WHERE email = 'admin@gmail.com'
ON CONFLICT DO NOTHING;

INSERT INTO announcements (society_id, title, content, category, priority, created_by)
SELECT 'SOC002', 'Water Tank Cleaning', 'Water supply will be suspended on Tuesday from 10 AM to 4 PM.', 'maintenance', 'normal', uid FROM users WHERE email = 'admin2@skyline.com'
ON CONFLICT DO NOTHING;

-- Complaints
INSERT INTO complaints (society_id, flat_id, user_id, title, description, category, priority, status)
SELECT 'SOC001', 'FLAT102-GV', uid, 'Leaking Tap', 'The kitchen tap is leaking since morning.', 'Plumbing', 'medium', 'open' FROM users WHERE email = 'tenant1@grandview.com'
ON CONFLICT DO NOTHING;

-- Visitors
INSERT INTO visitors (society_id, flat_id, name, phone, purpose, v_type, status)
VALUES 
('SOC001', 'FLAT101-GV', 'Sunil Kumar', '9876543210', 'Delivery', 'delivery', 'entered'),
('SOC002', 'FLAT101-SL', 'Rajesh Gupta', '9820033445', 'Guest', 'guest', 'entered');

-- Payments
INSERT INTO payments (society_id, flat_id, user_id, amount, type, status, due_date, description)
SELECT 'SOC001', 'FLAT101-GV', uid, 5000.00, 'maintenance', 'pending', NOW() + INTERVAL '10 days', 'February 2026 Maintenance' FROM users WHERE email = 'owner1@grandview.com'
ON CONFLICT DO NOTHING;

-- CCTV Cameras
INSERT INTO cctv_cameras (society_id, name, location, stream_url, is_active)
VALUES 
('SOC001', 'Main Gate', 'Entrance', 'https://images.unsplash.com/photo-1557597774-9d273605dfa9?w=800&q=80', true),
('SOC001', 'Lobby Tower A', 'Ground Floor', 'https://images.unsplash.com/photo-1557597774-9d273605dfa9?w=800&q=80', true),
('SOC002', 'Entry Point', 'North Side', 'https://images.unsplash.com/photo-1557597774-9d273605dfa9?w=800&q=80', true);

-- Salary Payments
INSERT INTO salary_payments (society_id, guard_id, amount, month, status, requested_at)
SELECT 'SOC001', uid, 15000.00, '2026-02', 'pending', NOW() FROM users WHERE email = 'guard1@grandview.com'
ON CONFLICT DO NOTHING;

INSERT INTO salary_payments (society_id, guard_id, amount, month, status, requested_at)
SELECT 'SOC002', uid, 14000.00, '2026-02', 'pending', NOW() FROM users WHERE email = 'guard2@skyline.com'
ON CONFLICT DO NOTHING;
