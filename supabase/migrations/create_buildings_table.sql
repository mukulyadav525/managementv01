-- Create Buildings Table
CREATE TABLE IF NOT EXISTS buildings (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  society_id TEXT REFERENCES societies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  total_floors INTEGER NOT NULL DEFAULT 1,
  total_flats INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE buildings ENABLE ROW LEVEL SECURITY;

-- Basic Policies
CREATE POLICY "Users can read buildings in their society" ON buildings
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM users WHERE users.uid = auth.uid() AND users.society_id = buildings.society_id)
  );

-- Seed initial buildings for SOC001 (Grand View)
INSERT INTO buildings (id, society_id, name, total_floors, total_flats)
VALUES 
('BUILDING-A-GV', 'SOC001', 'Building A', 5, 30),
('BUILDING-B-GV', 'SOC001', 'Building B', 4, 20)
ON CONFLICT (id) DO NOTHING;

-- Seed initial buildings for SOC002 (Skyline)
INSERT INTO buildings (id, society_id, name, total_floors, total_flats)
VALUES 
('BUILDING-1-SL', 'SOC002', 'Building 1', 6, 24),
('BUILDING-2-SL', 'SOC002', 'Building 2', 3, 12)
ON CONFLICT (id) DO NOTHING;

-- Map existing flats to buildings if they match IDs used in populate_db.sql
UPDATE flats SET building_id = 'BUILDING-A-GV' WHERE id = 'FLAT101-GV' OR id = 'FLAT102-GV';
UPDATE flats SET building_id = 'BUILDING-1-SL' WHERE id = 'FLAT101-SL';
