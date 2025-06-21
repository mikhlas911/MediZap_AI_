/*
  # Restore specialization column and sync with department

  1. Database Changes
    - Add back the specialization column to doctors table
    - Create a trigger to automatically set specialization from department name
    - Update existing doctors to have specialization from their department

  2. Functionality
    - When a doctor is added with a department, specialization is automatically set
    - When department is changed, specialization updates automatically
    - Maintains the logical connection between department and specialization
*/

-- Add back the specialization column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'doctors' 
    AND column_name = 'specialization'
  ) THEN
    ALTER TABLE doctors ADD COLUMN specialization text;
  END IF;
END $$;

-- Create a function to sync specialization with department
CREATE OR REPLACE FUNCTION sync_doctor_specialization()
RETURNS TRIGGER AS $$
BEGIN
  -- Get the department name and set it as specialization
  IF NEW.department_id IS NOT NULL THEN
    SELECT name INTO NEW.specialization
    FROM departments
    WHERE id = NEW.department_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically sync specialization when doctor is inserted or updated
DROP TRIGGER IF EXISTS sync_doctor_specialization_trigger ON doctors;

CREATE TRIGGER sync_doctor_specialization_trigger
  BEFORE INSERT OR UPDATE OF department_id ON doctors
  FOR EACH ROW
  EXECUTE FUNCTION sync_doctor_specialization();

-- Update existing doctors to have specialization from their department
UPDATE doctors 
SET specialization = departments.name
FROM departments
WHERE doctors.department_id = departments.id
AND doctors.specialization IS NULL;

-- Add index for better performance
CREATE INDEX IF NOT EXISTS idx_doctors_specialization ON doctors(specialization);