/*
  # Create RLS policies for walk_ins table

  1. RLS Policies
    - Allow public (unauthenticated) users to INSERT walk-ins with valid clinic_id
    - Allow authenticated clinic staff to SELECT walk-ins for their clinic
    - Allow authenticated clinic staff to UPDATE walk-ins for their clinic
    - Allow authenticated clinic staff to DELETE walk-ins for their clinic

  2. Security
    - Ensure only valid clinic_ids can be used for inserts
    - Restrict access to walk-ins based on clinic association
    - Maintain data integrity and privacy
*/

-- Enable RLS on walk_ins table
ALTER TABLE walk_ins ENABLE ROW LEVEL SECURITY;

-- Drop any existing policies to start fresh
DO $$
DECLARE
    policy_record RECORD;
BEGIN
    FOR policy_record IN 
        SELECT policyname FROM pg_policies WHERE tablename = 'walk_ins'
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || policy_record.policyname || '" ON walk_ins';
    END LOOP;
END $$;

-- Policy 1: Allow public users to insert walk-ins with valid clinic_id
CREATE POLICY "walk_ins_public_insert"
  ON walk_ins
  FOR INSERT
  TO public
  WITH CHECK (
    clinic_id IS NOT NULL 
    AND EXISTS (
      SELECT 1 FROM clinics 
      WHERE id = clinic_id 
      AND is_active = true
    )
  );

-- Policy 2: Allow authenticated users to view walk-ins for their clinics
CREATE POLICY "walk_ins_clinic_staff_select"
  ON walk_ins
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

-- Policy 3: Allow authenticated users to update walk-ins for their clinics
CREATE POLICY "walk_ins_clinic_staff_update"
  ON walk_ins
  FOR UPDATE
  TO authenticated
  USING (
    clinic_id IN (
      SELECT clinic_users.clinic_id
      FROM clinic_users
      WHERE clinic_users.user_id = auth.uid() 
      AND clinic_users.is_active = true
    )
  )
  WITH CHECK (
    clinic_id IN (
      SELECT clinic_users.clinic_id
      FROM clinic_users
      WHERE clinic_users.user_id = auth.uid() 
      AND clinic_users.is_active = true
    )
  );

-- Policy 4: Allow authenticated users to delete walk-ins for their clinics
CREATE POLICY "walk_ins_clinic_staff_delete"
  ON walk_ins
  FOR DELETE
  TO authenticated
  USING (
    clinic_id IN (
      SELECT clinic_users.clinic_id
      FROM clinic_users
      WHERE clinic_users.user_id = auth.uid() 
      AND clinic_users.is_active = true
    )
  );

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON walk_ins TO public;
GRANT SELECT, INSERT, UPDATE, DELETE ON walk_ins TO authenticated;

-- Grant usage on the sequence
GRANT USAGE, SELECT ON SEQUENCE walk_ins_id_seq TO public;
GRANT USAGE, SELECT ON SEQUENCE walk_ins_id_seq TO authenticated;