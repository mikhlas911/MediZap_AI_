/*
  # Fix Clinic Creation Function

  1. Database Changes
    - Update the create_clinic_with_admin function to include clinicname column
    - Ensure both name and clinicname columns are populated
    - Fix the NOT NULL constraint violation

  2. Security
    - Maintain existing security model
    - No changes to permissions or RLS policies
*/

-- Update the create_clinic_with_admin function to include clinicname column
CREATE OR REPLACE FUNCTION "public"."create_clinic_with_admin"("clinic_name" "text", "clinic_email" "text", "clinic_phone" "text" DEFAULT NULL::"text", "clinic_address" "text" DEFAULT NULL::"text", "clinic_website" "text" DEFAULT NULL::"text") RETURNS json
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  new_clinic_id uuid;
  current_user_id uuid;
  result json;
BEGIN
  -- Get the current user ID
  current_user_id := auth.uid();
  
  -- Check if user is authenticated
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'User must be authenticated to create a clinic';
  END IF;

  -- Validate required fields
  IF clinic_name IS NULL OR trim(clinic_name) = '' THEN
    RAISE EXCEPTION 'Clinic name is required';
  END IF;
  
  IF clinic_email IS NULL OR trim(clinic_email) = '' THEN
    RAISE EXCEPTION 'Clinic email is required';
  END IF;

  -- Check if clinic with this email already exists
  IF EXISTS (SELECT 1 FROM clinics WHERE email = clinic_email) THEN
    RAISE EXCEPTION 'A clinic with this email already exists';
  END IF;

  -- Create the clinic - IMPORTANT: Set both name and clinicname columns
  INSERT INTO clinics (name, clinicname, email, phone, address, website)
  VALUES (clinic_name, clinic_name, clinic_email, clinic_phone, clinic_address, clinic_website)
  RETURNING id INTO new_clinic_id;

  -- Add the current user as admin of the clinic
  INSERT INTO clinic_users (clinic_id, user_id, role, is_active)
  VALUES (new_clinic_id, current_user_id, 'admin', true);

  -- Create default departments for the clinic
  INSERT INTO departments (clinic_id, name, description, is_active)
  VALUES 
    (new_clinic_id, 'General Medicine', 'General medical consultations and check-ups', true),
    (new_clinic_id, 'Pediatrics', 'Medical care for infants, children, and adolescents', true),
    (new_clinic_id, 'Cardiology', 'Heart and cardiovascular system care', true),
    (new_clinic_id, 'Dermatology', 'Skin, hair, and nail care', true),
    (new_clinic_id, 'Orthopedics', 'Bone, joint, and muscle care', true);

  -- Return success result
  result := json_build_object(
    'success', true,
    'clinic_id', new_clinic_id,
    'message', 'Clinic created successfully with default departments'
  );

  RETURN result;

EXCEPTION
  WHEN OTHERS THEN
    -- Return error details
    RAISE EXCEPTION 'Failed to create clinic: %', SQLERRM;
END;
$$;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION "public"."create_clinic_with_admin"("clinic_name" "text", "clinic_email" "text", "clinic_phone" "text", "clinic_address" "text", "clinic_website" "text") TO "anon";
GRANT EXECUTE ON FUNCTION "public"."create_clinic_with_admin"("clinic_name" "text", "clinic_email" "text", "clinic_phone" "text", "clinic_address" "text", "clinic_website" "text") TO "authenticated";
GRANT EXECUTE ON FUNCTION "public"."create_clinic_with_admin"("clinic_name" "text", "clinic_email" "text", "clinic_phone" "text", "clinic_address" "text", "clinic_website" "text") TO "service_role";