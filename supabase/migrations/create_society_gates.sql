-- Create a function to handle updated_at automatically if it doesn't exist
CREATE OR REPLACE FUNCTION handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create Society Gates Table
CREATE TABLE IF NOT EXISTS society_gates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  society_id TEXT REFERENCES societies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  phone TEXT,
  status TEXT DEFAULT 'active', -- 'active', 'closed', 'maintenance'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.society_gates ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "member_read_gates" ON public.society_gates
    FOR SELECT USING (public.check_user_society(society_id));

CREATE POLICY "admin_manage_gates" ON public.society_gates
    FOR ALL USING (public.check_is_admin(society_id));

-- Add trigger for updated_at
DROP TRIGGER IF EXISTS set_gates_updated_at ON society_gates;
CREATE TRIGGER set_gates_updated_at
  BEFORE UPDATE ON society_gates
  FOR EACH ROW
  EXECUTE FUNCTION handle_updated_at();

-- Add some default gates for existing societies (Optional, but helpful for legacy data)
-- This is a one-time thing usually handled by seeding, but here we just ensure the table exists.
