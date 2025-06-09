-- Blood Pressure Analyzer Database Schema
-- Complete setup script for Supabase database
-- Run this SQL in your Supabase SQL editor

-- ==============================================================================
-- TABLES
-- ==============================================================================

-- Blood Pressure Readings Table
CREATE TABLE IF NOT EXISTS blood_pressure_readings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  systolic INTEGER NOT NULL CHECK (systolic > 0 AND systolic < 300),
  diastolic INTEGER NOT NULL CHECK (diastolic > 0 AND diastolic < 200),
  pulse INTEGER NOT NULL CHECK (pulse > 0 AND pulse < 300),
  timestamp TIMESTAMPTZ NOT NULL,
  image_url TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- User Profiles Table
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  date_of_birth DATE,
  weight_kg DECIMAL(5,2) CHECK (weight_kg > 0 AND weight_kg < 1000),
  height_cm INTEGER CHECK (height_cm > 0 AND height_cm < 300),
  gender VARCHAR(20) CHECK (gender IN ('male', 'female', 'other', 'prefer_not_to_say')),
  medical_conditions TEXT[],
  medications TEXT[],
  emergency_contact_name VARCHAR(255),
  emergency_contact_phone VARCHAR(50),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

-- ==============================================================================
-- INDEXES
-- ==============================================================================

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_blood_pressure_timestamp ON blood_pressure_readings(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_blood_pressure_user_id ON blood_pressure_readings(user_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id ON user_profiles(user_id);

-- ==============================================================================
-- FUNCTIONS AND TRIGGERS
-- ==============================================================================

-- Create trigger function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for user_profiles
DROP TRIGGER IF EXISTS update_user_profiles_updated_at ON user_profiles;
CREATE TRIGGER update_user_profiles_updated_at 
    BEFORE UPDATE ON user_profiles 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- ==============================================================================
-- PERMISSIONS
-- ==============================================================================

-- Grant necessary permissions to anon and authenticated roles
-- This is CRITICAL for the app to work properly
GRANT ALL ON blood_pressure_readings TO anon;
GRANT ALL ON blood_pressure_readings TO authenticated;
GRANT ALL ON user_profiles TO anon;
GRANT ALL ON user_profiles TO authenticated;

-- Grant usage on sequences (for auto-generated IDs)
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO anon;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- ==============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ==============================================================================

-- Enable Row Level Security on both tables
ALTER TABLE blood_pressure_readings ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can access their own readings" ON blood_pressure_readings;
DROP POLICY IF EXISTS "Users can insert their own readings" ON blood_pressure_readings;
DROP POLICY IF EXISTS "Users can manage their own profile" ON user_profiles;

-- Create RLS policies for blood_pressure_readings
CREATE POLICY "Users can access their own readings" ON blood_pressure_readings
FOR ALL TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own readings" ON blood_pressure_readings
FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Create RLS policy for user_profiles
CREATE POLICY "Users can manage their own profile" ON user_profiles
FOR ALL TO authenticated
USING (auth.uid() = user_id);

-- ==============================================================================
-- VERIFICATION QUERIES
-- ==============================================================================

-- Uncomment these to verify the setup:
-- SELECT tablename, rowsecurity FROM pg_tables WHERE tablename IN ('blood_pressure_readings', 'user_profiles');
-- SELECT schemaname, tablename, policyname FROM pg_policies WHERE tablename IN ('blood_pressure_readings', 'user_profiles');
-- SELECT grantee, privilege_type FROM information_schema.role_table_grants WHERE table_name IN ('blood_pressure_readings', 'user_profiles');