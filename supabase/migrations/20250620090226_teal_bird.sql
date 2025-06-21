/*
  # Fix Call Logs and Conversation Logs Policy Conflicts

  1. Policy Fixes
    - Drop all existing policies for call_logs and conversation_logs tables
    - Recreate them safely with proper permissions
    - Use DO blocks to prevent future conflicts

  2. Security
    - Maintain proper RLS protection
    - Ensure clinic staff can only access their clinic's data
    - Allow system operations for logging
*/

-- Drop all existing policies for call_logs table
DROP POLICY IF EXISTS "Clinic staff can view call logs" ON call_logs;
DROP POLICY IF EXISTS "System can insert call logs" ON call_logs;
DROP POLICY IF EXISTS "System can update call logs" ON call_logs;

-- Drop all existing policies for conversation_logs table
DROP POLICY IF EXISTS "Clinic staff can view conversation logs" ON conversation_logs;
DROP POLICY IF EXISTS "System can insert conversation logs" ON conversation_logs;

-- Recreate call_logs policies safely
DO $$
BEGIN
  -- SELECT policy for clinic staff
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'call_logs' 
    AND policyname = 'Clinic staff can view call logs'
  ) THEN
    CREATE POLICY "Clinic staff can view call logs"
      ON call_logs
      FOR SELECT
      TO authenticated
      USING (clinic_id IN (
        SELECT clinic_users.clinic_id
        FROM clinic_users
        WHERE clinic_users.user_id = auth.uid() AND clinic_users.is_active = true
      ));
  END IF;

  -- INSERT policy for system
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'call_logs' 
    AND policyname = 'System can insert call logs'
  ) THEN
    CREATE POLICY "System can insert call logs"
      ON call_logs
      FOR INSERT
      TO authenticated
      WITH CHECK (true);
  END IF;

  -- UPDATE policy for system
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'call_logs' 
    AND policyname = 'System can update call logs'
  ) THEN
    CREATE POLICY "System can update call logs"
      ON call_logs
      FOR UPDATE
      TO authenticated
      USING (true);
  END IF;
END $$;

-- Recreate conversation_logs policies safely
DO $$
BEGIN
  -- SELECT policy for clinic staff
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'conversation_logs' 
    AND policyname = 'Clinic staff can view conversation logs'
  ) THEN
    CREATE POLICY "Clinic staff can view conversation logs"
      ON conversation_logs
      FOR SELECT
      TO authenticated
      USING (clinic_id IN (
        SELECT clinic_users.clinic_id
        FROM clinic_users
        WHERE clinic_users.user_id = auth.uid() AND clinic_users.is_active = true
      ));
  END IF;

  -- INSERT policy for system
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'conversation_logs' 
    AND policyname = 'System can insert conversation logs'
  ) THEN
    CREATE POLICY "System can insert conversation logs"
      ON conversation_logs
      FOR INSERT
      TO authenticated
      WITH CHECK (true);
  END IF;
END $$;

-- Ensure RLS is enabled on both tables
ALTER TABLE call_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_logs ENABLE ROW LEVEL SECURITY;

-- Grant necessary permissions
GRANT ALL ON call_logs TO authenticated;
GRANT ALL ON conversation_logs TO authenticated;