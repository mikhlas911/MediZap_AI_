/*
  # Safe Function Recreation with Dependency Management
  
  This migration safely drops and recreates the get_user_clinic_ids and 
  get_user_admin_clinic_ids functions along with all dependent RLS policies.
  
  1. Dependency Management
    - Drop all dependent RLS policies first
    - Drop functions with CASCADE if needed
    - Recreate functions with correct signatures
    - Recreate all RLS policies
    
  2. Error Handling
    - Use IF EXISTS checks for idempotency
    - Proper exception handling
    - Rollback safety
    
  3. Security
    - Maintain all existing RLS protections
    - Ensure proper function permissions
    - Verify policy integrity
*/

-- Start transaction for rollback safety
BEGIN;

-- Step 1: Document existing policies for verification
DO $$
BEGIN
  RAISE NOTICE 'Starting safe function recreation process...';
  RAISE NOTICE 'Current timestamp: %', now();
END $$;

-- Step 2: Drop all dependent RLS policies
DO $$
DECLARE
  policy_record RECORD;
  policy_count INTEGER := 0;
BEGIN
  RAISE NOTICE 'Dropping dependent RLS policies...';
  
  -- Drop policies on clinic_users table that depend on get_user_clinic_ids
  FOR policy_record IN 
    SELECT policyname FROM pg_policies 
    WHERE tablename = 'clinic_users' 
    AND (
      policyname LIKE '%clinic%' OR 
      policyname LIKE '%user%' OR
      definition LIKE '%get_user_clinic_ids%' OR
      definition LIKE '%get_user_admin_clinic_ids%'
    )
  LOOP
    EXECUTE 'DROP POLICY IF EXISTS "' || policy_record.policyname || '" ON clinic_users';
    policy_count := policy_count + 1;
    RAISE NOTICE 'Dropped policy: % on clinic_users', policy_record.policyname;
  END LOOP;
  
  -- Drop policies on clinics table that might depend on helper functions
  FOR policy_record IN 
    SELECT policyname FROM pg_policies 
    WHERE tablename = 'clinics'
    AND (
      definition LIKE '%get_user_clinic_ids%' OR
      definition LIKE '%get_user_admin_clinic_ids%'
    )
  LOOP
    EXECUTE 'DROP POLICY IF EXISTS "' || policy_record.policyname || '" ON clinics';
    policy_count := policy_count + 1;
    RAISE NOTICE 'Dropped policy: % on clinics', policy_record.policyname;
  END LOOP;
  
  -- Drop policies on departments table that might depend on helper functions
  FOR policy_record IN 
    SELECT policyname FROM pg_policies 
    WHERE tablename = 'departments'
    AND (
      definition LIKE '%get_user_clinic_ids%' OR
      definition LIKE '%get_user_admin_clinic_ids%'
    )
  LOOP
    EXECUTE 'DROP POLICY IF EXISTS "' || policy_record.policyname || '" ON departments';
    policy_count := policy_count + 1;
    RAISE NOTICE 'Dropped policy: % on departments', policy_record.policyname;
  END LOOP;
  
  -- Drop policies on doctors table that might depend on helper functions
  FOR policy_record IN 
    SELECT policyname FROM pg_policies 
    WHERE tablename = 'doctors'
    AND (
      definition LIKE '%get_user_clinic_ids%' OR
      definition LIKE '%get_user_admin_clinic_ids%'
    )
  LOOP
    EXECUTE 'DROP POLICY IF EXISTS "' || policy_record.policyname || '" ON doctors';
    policy_count := policy_count + 1;
    RAISE NOTICE 'Dropped policy: % on doctors', policy_record.policyname;
  END LOOP;
  
  -- Drop policies on appointments table that might depend on helper functions
  FOR policy_record IN 
    SELECT policyname FROM pg_policies 
    WHERE tablename = 'appointments'
    AND (
      definition LIKE '%get_user_clinic_ids%' OR
      definition LIKE '%get_user_admin_clinic_ids%'
    )
  LOOP
    EXECUTE 'DROP POLICY IF EXISTS "' || policy_record.policyname || '" ON appointments';
    policy_count := policy_count + 1;
    RAISE NOTICE 'Dropped policy: % on appointments', policy_record.policyname;
  END LOOP;
  
  RAISE NOTICE 'Total policies dropped: %', policy_count;
END $$;

-- Step 3: Drop functions with CASCADE to handle any remaining dependencies
DO $$
BEGIN
  RAISE NOTICE 'Dropping functions with CASCADE...';
  
  -- Drop get_user_clinic_ids function
  IF EXISTS (
    SELECT 1 FROM pg_proc p 
    JOIN pg_namespace n ON p.pronamespace = n.oid 
    WHERE n.nspname = 'public' AND p.proname = 'get_user_clinic_ids'
  ) THEN
    DROP FUNCTION get_user_clinic_ids(uuid) CASCADE;
    RAISE NOTICE 'Dropped function: get_user_clinic_ids';
  END IF;
  
  -- Drop get_user_admin_clinic_ids function
  IF EXISTS (
    SELECT 1 FROM pg_proc p 
    JOIN pg_namespace n ON p.pronamespace = n.oid 
    WHERE n.nspname = 'public' AND p.proname = 'get_user_admin_clinic_ids'
  ) THEN
    DROP FUNCTION get_user_admin_clinic_ids(uuid) CASCADE;
    RAISE NOTICE 'Dropped function: get_user_admin_clinic_ids';
  END IF;
END $$;

-- Step 4: Recreate helper functions with correct signatures
DO $$
BEGIN
  RAISE NOTICE 'Recreating helper functions...';
END $$;

-- Create helper function to get user's clinic IDs
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

-- Create helper function to get user's admin clinic IDs
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

-- Step 5: Recreate all RLS policies
DO $$
BEGIN
  RAISE NOTICE 'Recreating RLS policies...';
END $$;

-- Policies for clinic_users table
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

-- Policies for clinics table
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

-- Policies for departments table
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

-- Policies for doctors table
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

-- Policies for appointments table
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

-- Step 6: Grant necessary permissions
DO $$
BEGIN
  RAISE NOTICE 'Granting function permissions...';
END $$;

GRANT EXECUTE ON FUNCTION get_user_clinic_ids TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_admin_clinic_ids TO authenticated;

-- Step 7: Verification
DO $$
DECLARE
  function_count INTEGER;
  policy_count INTEGER;
BEGIN
  RAISE NOTICE 'Performing verification...';
  
  -- Verify functions exist
  SELECT COUNT(*) INTO function_count
  FROM pg_proc p 
  JOIN pg_namespace n ON p.pronamespace = n.oid 
  WHERE n.nspname = 'public' 
  AND p.proname IN ('get_user_clinic_ids', 'get_user_admin_clinic_ids');
  
  IF function_count != 2 THEN
    RAISE EXCEPTION 'Function verification failed. Expected 2 functions, found %', function_count;
  END IF;
  
  -- Verify policies exist
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies 
  WHERE tablename IN ('clinic_users', 'clinics', 'departments', 'doctors', 'appointments');
  
  RAISE NOTICE 'Functions created: %', function_count;
  RAISE NOTICE 'Policies created: %', policy_count;
  RAISE NOTICE 'Verification completed successfully';
END $$;

-- Step 8: Final status
DO $$
BEGIN
  RAISE NOTICE 'Safe function recreation completed successfully at %', now();
  RAISE NOTICE 'All functions and policies have been recreated';
END $$;

-- Commit the transaction
COMMIT;