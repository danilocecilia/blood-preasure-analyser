-- Blood Pressure Readings Table
-- Run this SQL in your Supabase database

CREATE TABLE blood_pressure_readings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  systolic INTEGER NOT NULL CHECK (systolic > 0 AND systolic < 300),
  diastolic INTEGER NOT NULL CHECK (diastolic > 0 AND diastolic < 200),
  pulse INTEGER NOT NULL CHECK (pulse > 0 AND pulse < 300),
  timestamp TIMESTAMPTZ NOT NULL,
  image_url TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create an index on timestamp for faster queries
CREATE INDEX idx_blood_pressure_timestamp ON blood_pressure_readings(timestamp DESC);

-- Enable Row Level Security (RLS)
ALTER TABLE blood_pressure_readings ENABLE ROW LEVEL SECURITY;

-- Create a policy that allows all operations for authenticated users
-- You might want to restrict this based on user_id if you implement user authentication
CREATE POLICY "Allow all operations for authenticated users" ON blood_pressure_readings
FOR ALL USING (auth.role() = 'authenticated');

-- If you want to allow anonymous access (for testing), use this policy instead:
-- CREATE POLICY "Allow all operations for everyone" ON blood_pressure_readings
-- FOR ALL USING (true);