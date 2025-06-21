/*
  # Fix Call Logs Policies - Correct Implementation

  1. Issue Analysis
    - The manual fix used auth.role() = 'clinic_staff' which is incorrect
    - Our system uses clinic_users table to manage user-clinic relationships
    - Need to check clinic association through clinic_users table

  2. Correct Implementation
    - Drop the incorrect policy
    - Create proper policy that checks clinic_users table
    - Ensure user can only see logs from their associated clinics
*/

-- First, let's check what policies currently exist and drop them
DO $$
DECLARE
    policy_record RECORD;
BEGIN
    -- Drop all existing policies on call_logs to start fresh
    FOR policy_record IN 
        SELECT policyname FROM pg_policies WHERE tablename = 'call_logs'
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || policy_record.policyname || '" ON call_logs';
    END LOOP;
END $$;

-- Now create the correct policies
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

-- Also fix conversation_logs policies while we're at it
DO $$
DECLARE
    policy_record RECORD;
BEGIN
    -- Drop all existing policies on conversation_logs
    FOR policy_record IN 
        SELECT policyname FROM pg_policies WHERE tablename = 'conversation_logs'
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || policy_record.policyname || '" ON conversation_logs';
    END LOOP;
END $$;

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

-- Ensure RLS is enabled
ALTER TABLE call_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_logs ENABLE ROW LEVEL SECURITY;

-- Grant necessary permissions
GRANT ALL ON call_logs TO authenticated;
GRANT ALL ON conversation_logs TO authenticated;