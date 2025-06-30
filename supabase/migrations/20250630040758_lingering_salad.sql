/*
  # Update RLS policies for JWT authentication

  1. Security Changes
    - Update RLS policies to work with JWT authentication
    - Ensure appointments can be created by authenticated users
    - Add policy for users to view their own appointments

  2. Benefits
    - More secure authentication using Supabase JWT
    - Better integration with Supabase Auth
    - Improved user experience for patients
*/

-- Ensure appointments table has RLS enabled
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;

-- Ensure the created_by column exists in appointments table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'appointments' 
    AND column_name = 'created_by'
  ) THEN
    ALTER TABLE appointments ADD COLUMN created_by uuid REFERENCES auth.users(id);
  END IF;
END $$;

-- Create or replace policy for users to view their own appointments
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'appointments' 
    AND policyname = 'Users can view their own appointments'
  ) THEN
    DROP POLICY "Users can view their own appointments" ON appointments;
  END IF;
  
  CREATE POLICY "Users can view their own appointments"
    ON appointments
    FOR SELECT
    TO authenticated
    USING (auth.uid() = created_by);
END $$;

-- Create or replace policy for users to update their own appointments
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'appointments' 
    AND policyname = 'Users can update their own appointments'
  ) THEN
    DROP POLICY "Users can update their own appointments" ON appointments;
  END IF;
  
  CREATE POLICY "Users can update their own appointments"
    ON appointments
    FOR UPDATE
    TO authenticated
    USING (auth.uid() = created_by)
    WITH CHECK (auth.uid() = created_by);
END $$;

-- Create or replace policy for public insert access to appointments
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'appointments' 
    AND policyname = 'Allow public insert access to appointments'
  ) THEN
    DROP POLICY "Allow public insert access to appointments" ON appointments;
  END IF;
  
  CREATE POLICY "Allow public insert access to appointments"
    ON appointments
    FOR INSERT
    TO public
    WITH CHECK (true);
END $$;

-- Grant necessary permissions
GRANT ALL ON appointments TO authenticated;
GRANT ALL ON appointments TO anon;