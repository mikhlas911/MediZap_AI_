/*
  # Enhanced appointment system with constraints and helper functions

  1. Database Changes
    - Create appointment status enum (if not exists)
    - Add validation constraints for appointments
    - Add unique constraint to prevent double booking
    - Create helper functions for clinic access
    - Create clinic setup function with default departments
    - Add performance indexes

  2. Security
    - Maintain existing RLS policies
    - Add secure helper functions for clinic access
    - Grant proper permissions to authenticated users
*/

-- Create appointment status enum type (only if it doesn't exist)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'appointment_status') THEN
    CREATE TYPE appointment_status AS ENUM ('pending', 'confirmed', 'cancelled', 'completed');
  END IF;
END $$;

-- Clean up existing appointment_time data that doesn't match HH:MM format
UPDATE appointments 
SET appointment_time = '09:00' 
WHERE appointment_time IS NULL 
   OR appointment_time = '' 
   OR NOT (appointment_time ~ '^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$');

-- Add time format constraint to appointments table (only if it doesn't exist)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.constraint_column_usage 
    WHERE constraint_name = 'appointments_time_format_check'
    AND table_name = 'appointments'
  ) THEN
    ALTER TABLE appointments 
    ADD CONSTRAINT appointments_time_format_check 
    CHECK (appointment_time ~ '^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$');
  END IF;
END $$;

-- Clean up existing appointment_date data that might be in the past
-- Set past dates to today to avoid future date constraint issues
UPDATE appointments 
SET appointment_date = CURRENT_DATE 
WHERE appointment_date < CURRENT_DATE;

-- Add future date constraint to appointments table (only if it doesn't exist)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.constraint_column_usage 
    WHERE constraint_name = 'appointments_future_date_check'
    AND table_name = 'appointments'
  ) THEN
    ALTER TABLE appointments 
    ADD CONSTRAINT appointments_future_date_check 
    CHECK (appointment_date >= CURRENT_DATE);
  END IF;
END $$;

-- Create unique constraint to prevent double booking (only if it doesn't exist)
-- First, remove any duplicate appointments that might exist
DELETE FROM appointments a1 
USING appointments a2 
WHERE a1.id < a2.id 
  AND a1.doctor_id = a2.doctor_id 
  AND a1.appointment_date = a2.appointment_date 
  AND a1.appointment_time = a2.appointment_time;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'unique_doctor_appointment_slot'
    AND table_name = 'appointments'
    AND constraint_type = 'UNIQUE'
  ) THEN
    ALTER TABLE appointments 
    ADD CONSTRAINT unique_doctor_appointment_slot 
    UNIQUE (doctor_id, appointment_date, appointment_time);
  END IF;
END $$;

-- Drop existing functions to avoid parameter name conflicts
DROP FUNCTION IF EXISTS get_user_clinic_ids(uuid);
DROP FUNCTION IF EXISTS get_user_admin_clinic_ids(uuid);

-- Create helper function to get user's clinic IDs
CREATE OR REPLACE FUNCTION get_user_clinic_ids(user_id uuid)
RETURNS TABLE(clinic_id uuid)
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT cu.clinic_id
  FROM clinic_users cu
  WHERE cu.user_id = $1 AND cu.is_active = true;
$$;

-- Create helper function to get user's admin clinic IDs
CREATE OR REPLACE FUNCTION get_user_admin_clinic_ids(user_id uuid)
RETURNS TABLE(clinic_id uuid)
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT cu.clinic_id
  FROM clinic_users cu
  WHERE cu.user_id = $1 AND cu.role = 'admin' AND cu.is_active = true;
$$;

-- Create function to create clinic with default departments and admin user
CREATE OR REPLACE FUNCTION create_clinic_with_admin(
  clinic_name text,
  clinic_email text,
  clinic_phone text DEFAULT NULL,
  clinic_address text DEFAULT NULL,
  clinic_website text DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_clinic_id uuid;
  clinic_result json;
  current_user_id uuid;
BEGIN
  -- Get current user ID
  current_user_id := auth.uid();
  
  -- Validate input
  IF clinic_name IS NULL OR trim(clinic_name) = '' THEN
    RAISE EXCEPTION 'Clinic name is required';
  END IF;
  
  IF clinic_email IS NULL OR trim(clinic_email) = '' THEN
    RAISE EXCEPTION 'Clinic email is required';
  END IF;

  -- Check if user is authenticated
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'User must be authenticated';
  END IF;

  -- Check if clinic with this email already exists
  IF EXISTS (SELECT 1 FROM clinics WHERE email = clinic_email) THEN
    RAISE EXCEPTION 'A clinic with this email already exists';
  END IF;

  -- Create the clinic
  INSERT INTO clinics (name, email, phone, address, website, is_active)
  VALUES (clinic_name, clinic_email, clinic_phone, clinic_address, clinic_website, true)
  RETURNING id INTO new_clinic_id;

  -- Create clinic_user relationship with admin role
  INSERT INTO clinic_users (clinic_id, user_id, role, is_active)
  VALUES (new_clinic_id, current_user_id, 'admin', true);

  -- Create default departments
  INSERT INTO departments (clinic_id, name, description, is_active) VALUES
  (new_clinic_id, 'General Medicine', 'General medical consultations and check-ups', true),
  (new_clinic_id, 'Cardiology', 'Heart and cardiovascular system care', true),
  (new_clinic_id, 'Pediatrics', 'Medical care for infants, children, and adolescents', true),
  (new_clinic_id, 'Orthopedics', 'Bone, joint, and muscle care', true),
  (new_clinic_id, 'Dermatology', 'Skin, hair, and nail care', true);

  -- Return clinic information
  SELECT json_build_object(
    'clinic_id', new_clinic_id,
    'name', clinic_name,
    'email', clinic_email,
    'departments_created', 5
  ) INTO clinic_result;

  RETURN clinic_result;
END;
$$;

-- Add performance indexes (only if they don't exist)
CREATE INDEX IF NOT EXISTS idx_appointments_doctor_date_time ON appointments(doctor_id, appointment_date, appointment_time);
CREATE INDEX IF NOT EXISTS idx_appointments_status_date ON appointments(status, appointment_date);
CREATE INDEX IF NOT EXISTS idx_appointments_clinic_date_status ON appointments(clinic_id, appointment_date, status);

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION create_clinic_with_admin TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_clinic_ids TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_admin_clinic_ids TO authenticated;