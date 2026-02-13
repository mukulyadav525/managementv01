-- Security Guard Role - Database Schema
-- This creates all necessary tables and RLS policies for security guard functionality

-- 1. Create Salary Payments Table
CREATE TABLE IF NOT EXISTS salary_payments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  society_id TEXT REFERENCES societies(id) ON DELETE CASCADE,
  guard_id UUID REFERENCES users(uid) ON DELETE CASCADE,
  amount DECIMAL(10,2) NOT NULL,
  month TEXT NOT NULL, -- Format: 'YYYY-MM'
  status TEXT DEFAULT 'pending', -- pending, approved, paid
  requested_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  approved_at TIMESTAMP WITH TIME ZONE,
  paid_at TIMESTAMP WITH TIME ZONE,
  approved_by UUID REFERENCES users(uid),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Create CCTV Cameras Table
CREATE TABLE IF NOT EXISTS cctv_cameras (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  society_id TEXT REFERENCES societies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  location TEXT,
  stream_url TEXT,
  recording_url TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Enable RLS on new tables
ALTER TABLE salary_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE cctv_cameras ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policies for salary_payments

-- Guards can view their own salary payments
CREATE POLICY "guards_view_own_salary" ON salary_payments
    FOR SELECT
    TO authenticated
    USING (guard_id = auth.uid());

-- Guards can request salary payments
CREATE POLICY "guards_request_salary" ON salary_payments
    FOR INSERT
    TO authenticated
    WITH CHECK (
        guard_id = auth.uid() AND
        EXISTS (
            SELECT 1 FROM users
            WHERE uid = auth.uid() AND role = 'security'
        )
    );

-- Admins can view all salary payments in their society
CREATE POLICY "admins_view_all_salaries" ON salary_payments
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE uid = auth.uid()
            AND role = 'admin'
            AND society_id = salary_payments.society_id
        )
    );

-- Admins can update salary payment status
CREATE POLICY "admins_update_salaries" ON salary_payments
    FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE uid = auth.uid()
            AND role = 'admin'
            AND society_id = salary_payments.society_id
        )
    );

-- Admins can delete salary payments
CREATE POLICY "admins_delete_salaries" ON salary_payments
    FOR DELETE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE uid = auth.uid()
            AND role = 'admin'
            AND society_id = salary_payments.society_id
        )
    );

-- 5. RLS Policies for cctv_cameras

-- Security guards and admins can view CCTV cameras
CREATE POLICY "security_and_admins_view_cctv" ON cctv_cameras
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE uid = auth.uid()
            AND role IN ('security', 'admin')
            AND society_id = cctv_cameras.society_id
        )
    );

-- Only admins can manage CCTV cameras
CREATE POLICY "admins_manage_cctv" ON cctv_cameras
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE uid = auth.uid()
            AND role = 'admin'
            AND society_id = cctv_cameras.society_id
        )
    );

-- 6. Update existing RLS policies for security guard access

-- Allow security guards to view all users in their society (residents list)
DROP POLICY IF EXISTS "security_view_residents" ON users;
CREATE POLICY "security_view_residents" ON users
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM users AS guard
            WHERE guard.uid = auth.uid()
            AND guard.role = 'security'
            AND guard.society_id = users.society_id
        )
    );

-- Allow security guards to add visitors
DROP POLICY IF EXISTS "security_add_visitors" ON visitors;
CREATE POLICY "security_add_visitors" ON visitors
    FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM users
            WHERE uid = auth.uid()
            AND role = 'security'
            AND society_id = visitors.society_id
        )
    );

-- Allow security guards to view all visitors in their society
DROP POLICY IF EXISTS "security_view_visitors" ON visitors;
CREATE POLICY "security_view_visitors" ON visitors
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE uid = auth.uid()
            AND role = 'security'
            AND society_id = visitors.society_id
        )
    );

-- Allow security guards to update visitor status
DROP POLICY IF EXISTS "security_update_visitors" ON visitors;
CREATE POLICY "security_update_visitors" ON visitors
    FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE uid = auth.uid()
            AND role = 'security'
            AND society_id = visitors.society_id
        )
    );

-- Allow security guards to raise complaints
DROP POLICY IF EXISTS "security_raise_complaints" ON complaints;
CREATE POLICY "security_raise_complaints" ON complaints
    FOR INSERT
    TO authenticated
    WITH CHECK (
        user_id = auth.uid() AND
        EXISTS (
            SELECT 1 FROM users
            WHERE uid = auth.uid()
            AND role = 'security'
        )
    );

-- Allow security guards to view all complaints in their society
DROP POLICY IF EXISTS "security_view_complaints" ON complaints;
CREATE POLICY "security_view_complaints" ON complaints
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE uid = auth.uid()
            AND role = 'security'
            AND society_id = complaints.society_id
        )
    );

-- Allow security guards to view announcements
DROP POLICY IF EXISTS "security_view_announcements" ON announcements;
CREATE POLICY "security_view_announcements" ON announcements
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE uid = auth.uid()
            AND role = 'security'
            AND society_id = announcements.society_id
        )
    );

-- Allow security guards to create announcements
DROP POLICY IF EXISTS "security_create_announcements" ON announcements;
CREATE POLICY "security_create_announcements" ON announcements
    FOR INSERT
    TO authenticated
    WITH CHECK (
        created_by = auth.uid() AND
        EXISTS (
            SELECT 1 FROM users
            WHERE uid = auth.uid()
            AND role = 'security'
            AND society_id = announcements.society_id
        )
    );

-- Notify PostgREST to reload schema
NOTIFY pgrst, 'reload schema';
