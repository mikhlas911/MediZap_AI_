/*
  # Add clinic slugs for QR-based walk-in registration

  1. New Features
    - Add unique slug column to clinics table
    - Create function to generate clinic slugs
    - Add indexes for performance
    - Update existing clinics with slugs

  2. Security
    - Maintain existing RLS policies
    - Ensure slug uniqueness
*/

-- Add slug column to clinics table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'clinics' 
    AND column_name = 'slug'
  ) THEN
    ALTER TABLE clinics ADD COLUMN slug text UNIQUE;
  END IF;
END $$;

-- Create function to generate clinic slug
CREATE OR REPLACE FUNCTION generate_clinic_slug(clinic_name text)
RETURNS text AS $$
DECLARE
  base_slug text;
  final_slug text;
  counter integer := 0;
BEGIN
  -- Create base slug from clinic name
  base_slug := lower(regexp_replace(clinic_name, '[^a-zA-Z0-9]+', '-', 'g'));
  base_slug := trim(both '-' from base_slug);
  
  -- Ensure slug is not empty
  IF base_slug = '' THEN
    base_slug := 'clinic';
  END IF;
  
  final_slug := base_slug;
  
  -- Check for uniqueness and add counter if needed
  WHILE EXISTS (SELECT 1 FROM clinics WHERE slug = final_slug) LOOP
    counter := counter + 1;
    final_slug := base_slug || '-' || counter;
  END LOOP;
  
  RETURN final_slug;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-generate slug on insert/update
CREATE OR REPLACE FUNCTION set_clinic_slug()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.slug IS NULL OR NEW.slug = '' THEN
    NEW.slug := generate_clinic_slug(NEW.name);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS set_clinic_slug_trigger ON clinics;

-- Create trigger
CREATE TRIGGER set_clinic_slug_trigger
  BEFORE INSERT OR UPDATE ON clinics
  FOR EACH ROW
  EXECUTE FUNCTION set_clinic_slug();

-- Update existing clinics with slugs
UPDATE clinics 
SET slug = generate_clinic_slug(name)
WHERE slug IS NULL;

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_clinics_slug ON clinics(slug);

-- Add constraint to ensure slug is not null
ALTER TABLE clinics ALTER COLUMN slug SET NOT NULL;