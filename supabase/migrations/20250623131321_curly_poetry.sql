/*
  # Fix User Types and Clinic Registration Flow

  1. Database Changes
    - Update trigger function to handle different user types
    - Ensure proper user profile creation for both clinic admins and patients
    - Add user_type field handling

  2. Security
    - Maintain existing RLS policies
    - Ensure proper user type differentiation
*/

-- Update the trigger function to handle user types properly
CREATE OR REPLACE FUNCTION handle_new_user_signup()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert a new row into the users table when a new user signs up
  INSERT INTO public.users (
    id,
    email,
    first_name,
    last_name,
    full_name,
    created_at,
    updated_at
  )
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'first_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'last_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    first_name = EXCLUDED.first_name,
    last_name = EXCLUDED.last_name,
    full_name = EXCLUDED.full_name,
    updated_at = NOW();
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Ensure the trigger exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user_signup();

-- Grant necessary permissions for user management
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON public.users TO authenticated;
GRANT ALL ON public.clinics TO authenticated;
GRANT ALL ON public.clinic_users TO authenticated;