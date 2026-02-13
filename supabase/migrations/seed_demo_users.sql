-- Seed script for creating demo users and sample data
-- Run this in your Supabase SQL Editor

-- First, you need to create auth users in Supabase Auth Dashboard or via Supabase CLI
-- Then, insert their profiles into the users table

-- Note: Replace the UIDs below with actual UIDs from your Supabase Auth users
-- You can create auth users via Supabase Dashboard > Authentication > Users > Add User

-- Example: After creating auth users in Supabase, insert their profiles:

-- Admin User Profile
INSERT INTO users (uid, email, name, phone, role, society_id, flat_ids, status, created_at, updated_at)
VALUES (
  '4f3be381-f60e-467c-99fd-d75235e12563',  -- Replace with actual admin UID from Supabase Auth
  'admin@society.com',
  'Admin User',
  '9999999999',
  'admin',
  'SOC001',
  ARRAY[]::TEXT[],
  'active',
  NOW(),
  NOW()
) ON CONFLICT (uid) DO UPDATE
SET role = 'admin', society_id = 'SOC001';

-- Owner User Profile  
INSERT INTO users (uid, email, name, phone, role, society_id, flat_ids, status, created_at, updated_at)
VALUES (
  'b787cd2c-e65d-4762-b918-870f3040359f',  -- Replace with actual owner UID from Supabase Auth
  'owner@society.com',
  'Owner User',
  '8888888888',
  'owner',
  'SOC001',
  ARRAY['FLAT001', 'FLAT002']::TEXT[],
  'active',
  NOW(),
  NOW()
) ON CONFLICT (uid) DO UPDATE
SET role = 'owner', society_id = 'SOC001', flat_ids = ARRAY['FLAT001', 'FLAT002']::TEXT[];

-- Tenant User Profile
INSERT INTO users (uid, email, name, phone, role, society_id, flat_ids, status, created_at, updated_at)
VALUES (
  '2dda6f7a-2591-4ddb-9bee-1cb1bc842326',  -- Replace with actual tenant UID from Supabase Auth
  'tenant@society.com',
  'Tenant User',
  '7777777777',
  'tenant',
  'SOC001',
  ARRAY['FLAT003']::TEXT[],
  'active',
  NOW(),
  NOW()
) ON CONFLICT (uid) DO UPDATE
SET role = 'tenant', society_id = 'SOC001', flat_ids = ARRAY['FLAT003']::TEXT[];

-- Insert sample society
INSERT INTO societies (id, name, address, total_flats, total_buildings, contact_email, contact_phone, amenities, settings, created_at, updated_at)
VALUES (
  'SOC001',
  'Green Valley Society',
  '{"street": "123 Main St", "area": "Downtown", "city": "Mumbai", "state": "Maharashtra", "pincode": "400001"}'::JSONB,
  100,
  5,
  'contact@greenvalley.com',
  '+91-1234567890',
  ARRAY['Swimming Pool', 'Gym', 'Garden', 'Parking']::TEXT[],
  '{"maintenanceDay": 1, "latePaymentPenalty": 100, "visitorApprovalRequired": true}'::JSONB,
  NOW(),
  NOW()
) ON CONFLICT (id) DO UPDATE
SET name = 'Green Valley Society';

-- Insert sample flats
INSERT INTO flats (id, society_id, building_id, flat_number, floor, bhk_type, area, occupancy_status, owner_id, tenant_id, created_at, updated_at)
VALUES 
  ('FLAT001', 'SOC001', 'A', '101', 1, '2BHK', 1200, 'owner-occupied', 'b787cd2c-e65d-4762-b918-870f3040359f', NULL, NOW(), NOW()),
  ('FLAT002', 'SOC001', 'A', '102', 1, '3BHK', 1500, 'rented', 'b787cd2c-e65d-4762-b918-870f3040359f', '2dda6f7a-2591-4ddb-9bee-1cb1bc842326', NOW(), NOW()),
  ('FLAT003', 'SOC001', 'A', '201', 2, '2BHK', 1200, 'rented', 'b787cd2c-e65d-4762-b918-870f3040359f', '2dda6f7a-2591-4ddb-9bee-1cb1bc842326', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;
