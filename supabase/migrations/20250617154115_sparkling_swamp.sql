/*
  # Fix clinic INSERT policy for new clinic creation

  1. Security Changes
    - Drop the existing restrictive INSERT policy on clinics table
    - Create a new INSERT policy that allows authenticated users to create clinics
    - This enables new users to register their clinics without being blocked by RLS

  The current policy was preventing new clinic creation because users weren't 
  associated with any clinic yet when trying to create one.
*/

-- Drop the existing INSERT policy that's too restrictive
DROP POLICY IF EXISTS "Allow authenticated users to create clinics" ON clinics;

-- Create a new INSERT policy that actually allows authenticated users to insert
CREATE POLICY "Authenticated users can create clinics"
  ON clinics
  FOR INSERT
  TO authenticated
  WITH CHECK (true);