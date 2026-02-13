-- Ensure CCTV cameras table exists
CREATE TABLE IF NOT EXISTS cctv_cameras (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  society_id TEXT NOT NULL,
  name TEXT NOT NULL,
  location TEXT,
  stream_url TEXT,
  recording_url TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE cctv_cameras ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "security_and_admins_view_cctv" ON cctv_cameras;
DROP POLICY IF EXISTS "admins_manage_cctv" ON cctv_cameras;

-- Create view policy for security and admins
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

-- Create manage policy for admins
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

-- Insert a dummy camera for testing (Wait for user to provide their society_id or add generically)
-- NOTE: Replace 'YOUR_SOCIETY_ID' with an actual society ID if known
-- INSERT INTO cctv_cameras (society_id, name, location, stream_url)
-- VALUES ('YOUR_SOCIETY_ID', 'Main Gate', 'Entrance', 'https://www.youtube.com/embed/1EiC96_Pd_w');

-- Notify PostgREST
NOTIFY pgrst, 'reload schema';
