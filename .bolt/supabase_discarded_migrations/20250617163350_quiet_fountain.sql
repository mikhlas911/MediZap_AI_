/*
  # Fix clinic creation RLS policy

  1. Security Updates
    - Update the INSERT policy for clinics table to properly handle authenticated user creation
    - Ensure the policy allows authenticated users to create clinics with proper user association

  2. Changes
    - Modify the INSERT policy to be more explicit about authentication requirements
    - Add proper user validation in the policy
*/

-- Drop the existing INSERT policy for clinics
DROP POLICY IF EXISTS "Authenticated users can create clinics" ON clinics;

-- Create a new INSERT policy that properly validates authenticated users
CREATE POLICY "Authenticated users can create clinics"
  ON clinics
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

-- Ensure the clinic_users INSERT policy is also correct
DROP POLICY IF EXISTS "Users can insert own clinic_user record" ON clinic_users;

CREATE POLICY "Users can insert own clinic_user record"
  ON clinic_users
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());