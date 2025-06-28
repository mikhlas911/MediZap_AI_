/*
  # Fix clinic name column issues

  1. Database Schema Updates
    - Add missing `name` column to clinics table
    - Copy data from `clinicname` to `name` column
    - Create `get_public_clinics` function for public access

  2. Security
    - Grant appropriate permissions for the new function
    - Maintain existing RLS policies
*/

-- Add the missing 'name' column to clinics table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'clinics' AND column_name = 'name'
  ) THEN
    ALTER TABLE public.clinics ADD COLUMN name text;
  END IF;
END $$;

-- Copy data from clinicname to name column if name is empty
UPDATE public.clinics 
SET name = clinicname 
WHERE name IS NULL OR name = '';

-- Make name column NOT NULL after populating it
ALTER TABLE public.clinics ALTER COLUMN name SET NOT NULL;

-- Create the get_public_clinics function for public access
CREATE OR REPLACE FUNCTION public.get_public_clinics()
RETURNS TABLE(
    id uuid,
    name text,
    address text,
    phone text,
    slug text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT id, name, address, phone, slug
  FROM public.clinics
  WHERE is_active = true
  ORDER BY name;
$$;

-- Grant permissions for the function
GRANT EXECUTE ON FUNCTION public.get_public_clinics() TO anon, authenticated, service_role;