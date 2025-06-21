-- supabase/migrations/YYYYMMDDHHmmss_fix_clinic_functions.sql

-- This migration aims to safely drop and recreate the
-- get_user_clinic_ids and get_user_admin_clinic_ids functions,
-- along with their directly dependent RLS policies.
-- This is a targeted fix for the "cannot drop function because other objects depend on it" error.

-- Start a transaction for atomicity. If any step fails, the entire migration will be rolled back.
BEGIN;

-- Step 1: Drop the functions with CASCADE.
-- The CASCADE option will automatically drop all objects that depend on these functions,
-- including the RLS policies that use them. This is the most aggressive and
-- necessary step to clear the dependency chain.
-- Using IF EXISTS ensures the script is idempotent and doesn't error if functions are already gone.
RAISE NOTICE 'Dropping functions get_user_clinic_ids and get_user_admin_clinic_ids with CASCADE...';
DROP FUNCTION IF EXISTS get_user_clinic_ids(uuid) CASCADE;
DROP FUNCTION IF EXISTS get_user_admin_clinic_ids(uuid) CASCADE;
RAISE NOTICE 'Functions dropped.';

-- Step 2: Recreate the functions with the desired signature.
-- These functions are crucial for RLS policies to filter data based on the current user's clinic association.
RAISE NOTICE 'Recreating functions get_user_clinic_ids and get_user_admin_clinic_ids...';
CREATE OR REPLACE FUNCTION get_user_clinic_ids(target_user_id uuid)
RETURNS TABLE(clinic_id uuid)
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT cu.clinic_id
  FROM public.clinic_users cu
  WHERE cu.user_id = target_user_id AND cu.is_active = true;
$$;

CREATE OR REPLACE FUNCTION get_user_admin_clinic_ids(target_user_id uuid)
RETURNS TABLE(clinic_id uuid)
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT cu.clinic_id
  FROM public.clinic_users cu
  WHERE cu.user_id = target_user_id AND cu.role = 'admin' AND cu.is_active = true;
$$;
RAISE NOTICE 'Functions recreated.';

-- Step 3: Recreate the RLS policies that directly depend on these functions.
-- These policies were dropped by the CASCADE operation in Step 1.
-- We are recreating them exactly as they were defined in the original schema.

-- Policies for public.clinic_users table
RAISE NOTICE 'Recreating RLS policies for clinic_users, clinics, and appointments tables...';

CREATE POLICY "Admins can delete clinic_users"
  ON public.clinic_users
  FOR DELETE
  TO authenticated
  USING (clinic_id IN (
    SELECT get_user_admin_clinic_ids(auth.uid()) AS clinic_id
  ));

CREATE POLICY "Admins can update clinic_users"
  ON public.clinic_users
  FOR UPDATE
  TO authenticated
  USING (clinic_id IN (
    SELECT get_user_admin_clinic_ids(auth.uid()) AS clinic_id
  ))
  WITH CHECK (clinic_id IN (
    SELECT get_user_admin_clinic_ids(auth.uid()) AS clinic_id
  ));

CREATE POLICY "Users can insert own clinic_user record"
  ON public.clinic_users
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can view clinic_users in their clinics"
  ON public.clinic_users
  FOR SELECT
  TO authenticated
  USING (clinic_id IN (
    SELECT get_user_clinic_ids(auth.uid()) AS clinic_id
  ));

CREATE POLICY "Users can view own clinic_user record"
  ON public.clinic_users
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Policies for public.clinics table
CREATE POLICY "Admins can delete their clinic"
  ON public.clinics
  FOR DELETE
  TO authenticated
  USING (id IN (
    SELECT get_user_admin_clinic_ids(auth.uid()) AS clinic_id
  ));

CREATE POLICY "Authenticated users can create clinics"
  ON public.clinics
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can update their own clinic"
  ON public.clinics
  FOR UPDATE
  TO authenticated
  USING (id IN (
    SELECT get_user_admin_clinic_ids(auth.uid()) AS clinic_id
  ));

CREATE POLICY "Users can view their own clinic"
  ON public.clinics
  FOR SELECT
  TO authenticated
  USING (id IN (
    SELECT get_user_clinic_ids(auth.uid()) AS clinic_id
  ));

-- Policies for public.appointments table
CREATE POLICY "Allow public insert access to appointments"
  ON public.appointments
  FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Users can manage appointments in their clinic"
  ON public.appointments
  FOR ALL
  TO authenticated
  USING (clinic_id IN (
    SELECT get_user_clinic_ids(auth.uid()) AS clinic_id
  ));

CREATE POLICY "Users can view appointments in their clinic"
  ON public.appointments
  FOR SELECT
  TO authenticated
  USING (clinic_id IN (
    SELECT get_user_clinic_ids(auth.uid()) AS clinic_id
  ));
RAISE NOTICE 'RLS policies recreated.';

-- Step 4: Grant necessary permissions for the functions.
RAISE NOTICE 'Granting execute permissions on functions...';
GRANT EXECUTE ON FUNCTION get_user_clinic_ids(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_admin_clinic_ids(uuid) TO authenticated;
RAISE NOTICE 'Permissions granted.';

-- Commit the transaction.
COMMIT;
RAISE NOTICE 'Migration completed successfully.';
