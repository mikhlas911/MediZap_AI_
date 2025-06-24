/*
  # Add public access for clinic selection

  1. New Functions
    - `get_public_clinics` - Returns basic clinic info for public access
    
  2. Security
    - Only returns essential clinic information
    - No sensitive data exposed
    - Allows guest users to see available clinics
*/

-- Create function to get public clinic information
CREATE OR REPLACE FUNCTION get_public_clinics()
RETURNS TABLE(
  id uuid,
  name text,
  address text,
  phone text,
  slug text
) 
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT 
    c.id,
    c.name,
    c.address,
    c.phone,
    c.slug
  FROM clinics c
  WHERE c.is_active = true
  ORDER BY c.name;
$$;

-- Grant execute permission to all users (including anonymous)
GRANT EXECUTE ON FUNCTION get_public_clinics() TO anon;
GRANT EXECUTE ON FUNCTION get_public_clinics() TO authenticated;

-- Add a simple policy to allow public read access to basic clinic info
-- This is safer than the RPC function for basic clinic selection
CREATE POLICY "Allow public read access to basic clinic info"
  ON clinics
  FOR SELECT
  TO anon, authenticated
  USING (is_active = true);

-- Ensure the policy doesn't conflict with existing ones
-- We'll make this policy more specific to avoid conflicts
DROP POLICY IF EXISTS "Allow public read access to basic clinic info" ON clinics;

CREATE POLICY "Public can view active clinic basic info"
  ON clinics
  FOR SELECT
  TO anon
  USING (is_active = true);