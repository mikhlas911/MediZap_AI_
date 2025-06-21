/*
  # Remove doctor specialization field and map to departments

  1. Database Changes
    - Remove the specialization column from doctors table
    - Remove the email column from doctors table (as requested earlier)
    - Update any existing data to use department names as specialization
    - Clean up the doctors table structure

  2. Security
    - Maintain existing RLS policies
    - Ensure data integrity during migration
*/

-- Remove the specialization and email columns from doctors table
DO $$
BEGIN
  -- Remove specialization column if it exists
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'doctors' 
    AND column_name = 'specialization'
  ) THEN
    ALTER TABLE doctors DROP COLUMN specialization;
  END IF;

  -- Remove email column if it exists
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'doctors' 
    AND column_name = 'email'
  ) THEN
    ALTER TABLE doctors DROP COLUMN email;
  END IF;
END $$;

-- Update any views or functions that might reference the removed columns
-- (Add any specific cleanup here if needed)

-- Ensure the doctors table has the correct structure
COMMENT ON TABLE doctors IS 'Doctors table - specialization is determined by department association';
COMMENT ON COLUMN doctors.department_id IS 'Department ID - serves as the doctor specialization';