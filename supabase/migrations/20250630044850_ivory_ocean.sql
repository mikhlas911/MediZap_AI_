/*
  # Update Edge Functions to use JWT Authentication

  1. Security Changes
    - Remove custom secret authentication
    - Implement JWT token authentication for all edge functions
    - Update RLS policies to work with JWT authentication

  2. Benefits
    - Standard OAuth2/JWT authentication flow
    - Better integration with Supabase Auth
    - More secure token-based authentication
    - Automatic token expiration and refresh
*/

-- Create a function to verify JWT tokens
CREATE OR REPLACE FUNCTION verify_jwt_token(token text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_id uuid;
BEGIN
  -- This function is a placeholder since JWT verification is handled by Supabase Auth
  -- In a real implementation, we would verify the token signature and extract claims
  -- For now, we'll just return NULL to indicate this should be handled elsewhere
  RETURN NULL;
END;
$$;

-- Grant execute permission to all users
GRANT EXECUTE ON FUNCTION verify_jwt_token TO authenticated;
GRANT EXECUTE ON FUNCTION verify_jwt_token TO anon;

-- Ensure appointments table has created_by column for JWT auth
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

-- Update RLS policies for appointments to work with JWT auth
DO $$
BEGIN
  -- Ensure policy for users to view their own appointments exists
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'appointments' 
    AND policyname = 'Users can view their own appointments'
  ) THEN
    CREATE POLICY "Users can view their own appointments"
      ON appointments
      FOR SELECT
      TO authenticated
      USING (auth.uid() = created_by);
  END IF;

  -- Ensure policy for users to update their own appointments exists
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'appointments' 
    AND policyname = 'Users can update their own appointments'
  ) THEN
    CREATE POLICY "Users can update their own appointments"
      ON appointments
      FOR UPDATE
      TO authenticated
      USING (auth.uid() = created_by)
      WITH CHECK (auth.uid() = created_by);
  END IF;
END $$;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT USAGE ON SCHEMA public TO anon;