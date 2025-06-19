/*
  # Fix Clinic Insert Policy for Registration

  1. Policy Changes
    - Update the clinic insert policy to allow authenticated users to create clinics
    - This enables the registration flow where users need to create a clinic first
    - The existing policy was too restrictive for the registration process

  2. Security
    - Maintains RLS protection while allowing legitimate clinic creation
    - Users can only create clinics, not access others' clinics without proper relationships
*/

-- Drop the existing restrictive insert policy
DROP POLICY IF EXISTS "Allow authenticated users to create clinics" ON clinics;

-- Create a new policy that allows authenticated users to insert clinics
CREATE POLICY "Allow authenticated users to create clinics"
  ON clinics
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Ensure the select policy remains restrictive (users can only see clinics they're associated with)
-- This policy should already exist based on the schema, but let's make sure it's correct
DROP POLICY IF EXISTS "Users can view their own clinic" ON clinics;

CREATE POLICY "Users can view their own clinic"
  ON clinics
  FOR SELECT
  TO authenticated
  USING (id IN (
    SELECT clinic_users.clinic_id
    FROM clinic_users
    WHERE clinic_users.user_id = auth.uid()
  ));

-- Ensure the update policy remains restrictive (only admins can update)
-- This policy should already exist based on the schema
DROP POLICY IF EXISTS "Users can update their own clinic" ON clinics;

CREATE POLICY "Users can update their own clinic"
  ON clinics
  FOR UPDATE
  TO authenticated
  USING (id IN (
    SELECT clinic_users.clinic_id
    FROM clinic_users
    WHERE clinic_users.user_id = auth.uid() AND clinic_users.role = 'admin'
  ));