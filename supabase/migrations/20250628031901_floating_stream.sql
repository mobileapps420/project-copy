/*
  # Fix Migration Conflicts with Existing Schema

  This migration safely handles the existing database schema and ensures all necessary
  components are in place without causing conflicts.

  1. Tables
     - All tables already exist and are properly configured
     - Verify RLS policies are in place
     - Ensure triggers and functions exist

  2. Security
     - Row Level Security enabled on all tables
     - Proper policies for user data isolation
     - Secure functions for user registration

  3. Functions and Triggers
     - Update timestamp function
     - User registration handler
     - Automatic profile creation
*/

-- Create custom types only if they don't exist
DO $$ BEGIN
    CREATE TYPE session_status AS ENUM ('pending', 'in-progress', 'resolved');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE severity_level AS ENUM ('low', 'medium', 'high');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE message_type AS ENUM ('user', 'ai', 'system');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create or replace the update timestamp function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Ensure profiles table exists with proper structure
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text UNIQUE NOT NULL,
  full_name text,
  avatar_url text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS on profiles if not already enabled
DO $$
BEGIN
  IF NOT (SELECT relrowsecurity FROM pg_class WHERE relname = 'profiles') THEN
    ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

-- Create profiles policies if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'profiles' AND policyname = 'Users can read own profile') THEN
    CREATE POLICY "Users can read own profile"
      ON profiles
      FOR SELECT
      TO authenticated
      USING (auth.uid() = id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'profiles' AND policyname = 'Users can insert own profile') THEN
    CREATE POLICY "Users can insert own profile"
      ON profiles
      FOR INSERT
      TO authenticated
      WITH CHECK (auth.uid() = id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'profiles' AND policyname = 'Users can update own profile') THEN
    CREATE POLICY "Users can update own profile"
      ON profiles
      FOR UPDATE
      TO authenticated
      USING (auth.uid() = id);
  END IF;
END $$;

-- Create trigger for profiles updated_at if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_profiles_updated_at') THEN
    CREATE TRIGGER update_profiles_updated_at
      BEFORE UPDATE ON profiles
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

-- Ensure vehicles table exists
CREATE TABLE IF NOT EXISTS vehicles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  make text NOT NULL,
  model text NOT NULL,
  year integer NOT NULL,
  vin text,
  license_plate text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS on vehicles if not already enabled
DO $$
BEGIN
  IF NOT (SELECT relrowsecurity FROM pg_class WHERE relname = 'vehicles') THEN
    ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

-- Create vehicles trigger if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_vehicles_updated_at') THEN
    CREATE TRIGGER update_vehicles_updated_at
      BEFORE UPDATE ON vehicles
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

-- Ensure diagnostic_sessions table exists
CREATE TABLE IF NOT EXISTS diagnostic_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  vehicle_id uuid REFERENCES vehicles(id) ON DELETE SET NULL,
  issue_description text NOT NULL,
  status session_status DEFAULT 'pending',
  severity severity_level DEFAULT 'medium',
  recommendation text,
  duration_minutes integer,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS on diagnostic_sessions if not already enabled
DO $$
BEGIN
  IF NOT (SELECT relrowsecurity FROM pg_class WHERE relname = 'diagnostic_sessions') THEN
    ALTER TABLE diagnostic_sessions ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

-- Create diagnostic_sessions trigger if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_diagnostic_sessions_updated_at') THEN
    CREATE TRIGGER update_diagnostic_sessions_updated_at
      BEFORE UPDATE ON diagnostic_sessions
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

-- Ensure chat_messages table exists
CREATE TABLE IF NOT EXISTS chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES diagnostic_sessions(id) ON DELETE CASCADE,
  type message_type NOT NULL,
  content text NOT NULL,
  image_url text,
  audio_url text,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS on chat_messages if not already enabled
DO $$
BEGIN
  IF NOT (SELECT relrowsecurity FROM pg_class WHERE relname = 'chat_messages') THEN
    ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

-- Ensure dtc_codes table exists
CREATE TABLE IF NOT EXISTS dtc_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES diagnostic_sessions(id) ON DELETE CASCADE,
  code text NOT NULL,
  description text NOT NULL,
  severity severity_level DEFAULT 'medium',
  cleared_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS on dtc_codes if not already enabled
DO $$
BEGIN
  IF NOT (SELECT relrowsecurity FROM pg_class WHERE relname = 'dtc_codes') THEN
    ALTER TABLE dtc_codes ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

-- Ensure obd_data table exists
CREATE TABLE IF NOT EXISTS obd_data (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES diagnostic_sessions(id) ON DELETE CASCADE,
  rpm integer,
  speed integer,
  coolant_temp integer,
  fuel_pressure integer,
  voltage numeric(4,2),
  engine_load integer,
  recorded_at timestamptz DEFAULT now()
);

-- Enable RLS on obd_data if not already enabled
DO $$
BEGIN
  IF NOT (SELECT relrowsecurity FROM pg_class WHERE relname = 'obd_data') THEN
    ALTER TABLE obd_data ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

-- Create or replace function to handle new user registration
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to create profile on user signup if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'on_auth_user_created') THEN
    CREATE TRIGGER on_auth_user_created
      AFTER INSERT ON auth.users
      FOR EACH ROW EXECUTE FUNCTION handle_new_user();
  END IF;
END $$;