/*
  # Nuclear Fix for Function Dependencies
  
  This migration takes an aggressive approach to fix the function dependency issue:
  1. Explicitly drop ALL policies from affected tables
  2. Drop functions (should work now with no dependencies)
  3. Recreate functions with correct signatures
  4. Recreate all necessary policies
  
  This is a "nuclear" approach that ensures we start with a clean slate.
*/

-- Start transaction for rollback safety
BEGIN;

-- Step 1: Nuclear approach - drop ALL policies from affected tables
DO $$
DECLARE
  policy_record RECORD;
BEGIN
  RAISE NOTICE 'Starting nuclear policy cleanup...';
  
  -- Drop ALL policies from clinic_users table
  FOR policy_record IN 
    SELECT policyname FROM pg_policies WHERE tablename = 'clinic_users'
  LOOP
    EXECUTE 'DROP POLICY IF EXISTS "' || policy_record.policyname || '" ON clinic_users';
    RAISE NOTICE 'Dropped policy: % from clinic_users', policy_record.policyname;
  END LOOP;
  
  -- Drop ALL policies from clinics table
  FOR policy_record IN 
    SELECT policyname FROM pg_policies WHERE tablename = 'clinics'
  LOOP
    EXECUTE 'DROP POLICY IF EXISTS "' || policy_record.policyname || '" ON clinics';
    RAISE NOTICE 'Dropped policy: % from clinics', policy_record.policyname;
  END LOOP;
  
  -- Drop ALL policies from appointments table
  FOR policy_record IN 
    SELECT policyname FROM pg_policies WHERE tablename = 'appointments'
  LOOP
    EXECUTE 'DROP POLICY IF EXISTS "' || policy_record.policyname || '" ON appointments';
    RAISE NOTICE 'Dropped policy: % from appointments', policy_record.policyname;
  END LOOP;
  
  -- Drop ALL policies from departments table
  FOR policy_record IN 
    SELECT policyname FROM pg_policies WHERE tablename = 'departments'
  LOOP
    EXECUTE 'DROP POLICY IF EXISTS "' || policy_record.policyname || '" ON departments';
    RAISE NOTICE 'Dropped policy: % from departments', policy_record.policyname;
  END LOOP;
  
  -- Drop ALL policies from doctors table
  FOR policy_record IN 
    SELECT policyname FROM pg_policies WHERE tablename = 'doctors'
  LOOP
    EXECUTE 'DROP POLICY IF EXISTS "' || policy_record.policyname || '" ON doctors';
    RAISE NOTICE 'Dropped policy: % from doctors', policy_record.policyname;
  END LOOP;
  
  RAISE NOTICE 'All policies dropped from affected tables';
END $$;

-- Step 2: Now drop the functions (should work with no dependencies)
DO $$
BEGIN
  RAISE NOTICE 'Dropping functions...';
  
  -- Drop functions - should work now since all policies are gone
  DROP FUNCTION IF EXISTS get_user_clinic_ids(uuid);
  DROP FUNCTION IF EXISTS get_user_admin_clinic_ids(uuid);
  
  RAISE NOTICE 'Functions dropped successfully';
END $$;

-- Step 3: Recreate the functions with correct signatures
DO $$
BEGIN
  RAISE NOTICE 'Recreating functions...';
END $$;

CREATE OR REPLACE FUNCTION get_user_clinic_ids(target_user_id uuid)
RETURNS TABLE(clinic_id uuid)
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT cu.clinic_id
  FROM clinic_users cu
  WHERE cu.user_id = target_user_id AND cu.is_active = true;
$$;

CREATE OR REPLACE FUNCTION get_user_admin_clinic_ids(target_user_id uuid)
RETURNS TABLE(clinic_id uuid)
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT cu.clinic_id
  FROM clinic_users cu
  WHERE cu.user_id = target_user_id AND cu.role = 'admin' AND cu.is_active = true;
$$;

-- Step 4: Recreate ALL necessary policies
DO $$
BEGIN
  RAISE NOTICE 'Recreating all RLS policies...';
END $$;

-- Users table policies (these shouldn't have been affected but let's be safe)
CREATE POLICY "Users can insert own profile"
  ON users
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can read own data"
  ON users
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update own data"
  ON users
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Clinic_users policies
CREATE POLICY "Admins can delete clinic_users"
  ON clinic_users
  FOR DELETE
  TO authenticated
  USING (clinic_id IN (
    SELECT get_user_admin_clinic_ids(auth.uid()) AS clinic_id
  ));

CREATE POLICY "Admins can update clinic_users"
  ON clinic_users
  FOR UPDATE
  TO authenticated
  USING (clinic_id IN (
    SELECT get_user_admin_clinic_ids(auth.uid()) AS clinic_id
  ))
  WITH CHECK (clinic_id IN (
    SELECT get_user_admin_clinic_ids(auth.uid()) AS clinic_id
  ));

CREATE POLICY "Users can insert own clinic_user record"
  ON clinic_users
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can view clinic_users in their clinics"
  ON clinic_users
  FOR SELECT
  TO authenticated
  USING (clinic_id IN (
    SELECT get_user_clinic_ids(auth.uid()) AS clinic_id
  ));

CREATE POLICY "Users can view own clinic_user record"
  ON clinic_users
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Clinics policies
CREATE POLICY "Admins can delete their clinic"
  ON clinics
  FOR DELETE
  TO authenticated
  USING (id IN (
    SELECT get_user_admin_clinic_ids(auth.uid()) AS clinic_id
  ));

CREATE POLICY "Authenticated users can create clinics"
  ON clinics
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can update their own clinic"
  ON clinics
  FOR UPDATE
  TO authenticated
  USING (id IN (
    SELECT get_user_admin_clinic_ids(auth.uid()) AS clinic_id
  ));

CREATE POLICY "Users can view their own clinic"
  ON clinics
  FOR SELECT
  TO authenticated
  USING (id IN (
    SELECT get_user_clinic_ids(auth.uid()) AS clinic_id
  ));

-- Departments policies
CREATE POLICY "Allow public read access to active departments"
  ON departments
  FOR SELECT
  TO public
  USING (is_active = true);

CREATE POLICY "Authenticated users can manage departments"
  ON departments
  FOR ALL
  TO authenticated
  USING (EXISTS (
    SELECT 1
    FROM clinic_users cu
    WHERE cu.clinic_id = departments.clinic_id 
    AND cu.user_id = auth.uid() 
    AND cu.role = ANY (ARRAY['admin'::text, 'staff'::text]) 
    AND cu.is_active = true
  ));

-- Doctors policies
CREATE POLICY "Allow public read access to active doctors"
  ON doctors
  FOR SELECT
  TO public
  USING (is_active = true);

CREATE POLICY "Authenticated users can manage doctors"
  ON doctors
  FOR ALL
  TO authenticated
  USING (EXISTS (
    SELECT 1
    FROM clinic_users cu
    WHERE cu.clinic_id = doctors.clinic_id 
    AND cu.user_id = auth.uid() 
    AND cu.role = ANY (ARRAY['admin'::text, 'staff'::text]) 
    AND cu.is_active = true
  ));

-- Appointments policies
CREATE POLICY "Allow public insert access to appointments"
  ON appointments
  FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Users can manage appointments in their clinic"
  ON appointments
  FOR ALL
  TO authenticated
  USING (clinic_id IN (
    SELECT get_user_clinic_ids(auth.uid()) AS clinic_id
  ));

CREATE POLICY "Users can view appointments in their clinic"
  ON appointments
  FOR SELECT
  TO authenticated
  USING (clinic_id IN (
    SELECT get_user_clinic_ids(auth.uid()) AS clinic_id
  ));

-- Call logs policies (recreate the working ones)
CREATE POLICY "call_logs_clinic_staff_select"
  ON call_logs
  FOR SELECT
  TO authenticated
  USING (
    clinic_id IN (
      SELECT clinic_users.clinic_id
      FROM clinic_users
      WHERE clinic_users.user_id = auth.uid() 
      AND clinic_users.is_active = true
    )
  );

CREATE POLICY "call_logs_system_insert"
  ON call_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "call_logs_system_update"
  ON call_logs
  FOR UPDATE
  TO authenticated
  USING (true);

-- Conversation logs policies
CREATE POLICY "conversation_logs_clinic_staff_select"
  ON conversation_logs
  FOR SELECT
  TO authenticated
  USING (
    clinic_id IN (
      SELECT clinic_users.clinic_id
      FROM clinic_users
      WHERE clinic_users.user_id = auth.uid() 
      AND clinic_users.is_active = true
    )
  );

CREATE POLICY "conversation_logs_system_insert"
  ON conversation_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Step 5: Grant permissions
GRANT EXECUTE ON FUNCTION get_user_clinic_ids(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_admin_clinic_ids(uuid) TO authenticated;

-- Step 6: Ensure RLS is enabled on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE clinics ENABLE ROW LEVEL SECURITY;
ALTER TABLE clinic_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE doctors ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE call_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_logs ENABLE ROW LEVEL SECURITY;

-- Final verification
DO $$
DECLARE
  function_count INTEGER;
  policy_count INTEGER;
BEGIN
  -- Verify functions exist
  SELECT COUNT(*) INTO function_count
  FROM pg_proc p 
  JOIN pg_namespace n ON p.pronamespace = n.oid 
  WHERE n.nspname = 'public' 
  AND p.proname IN ('get_user_clinic_ids', 'get_user_admin_clinic_ids');
  
  -- Verify policies exist
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies 
  WHERE tablename IN ('clinic_users', 'clinics', 'departments', 'doctors', 'appointments', 'call_logs', 'conversation_logs');
  
  RAISE NOTICE 'Nuclear fix completed successfully';
  RAISE NOTICE 'Functions recreated: %', function_count;
  RAISE NOTICE 'Total policies recreated: %', policy_count;
  
  IF function_count != 2 THEN
    RAISE EXCEPTION 'Function verification failed. Expected 2 functions, found %', function_count;
  END IF;
END $$;

-- Commit the transaction
COMMIT;

RAISE NOTICE 'Nuclear function fix completed successfully at %', now();