/*
  # Nuclear fix for all policy conflicts
  
  This migration completely removes all policies from call_logs and conversation_logs
  tables and recreates them from scratch to ensure no conflicts.
*/

-- Disable RLS temporarily to clear everything
ALTER TABLE call_logs DISABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_logs DISABLE ROW LEVEL SECURITY;

-- Nuclear drop: Remove ALL policies from these tables
DO $$
DECLARE
    policy_record RECORD;
BEGIN
    -- Drop all policies from call_logs
    FOR policy_record IN 
        SELECT policyname FROM pg_policies WHERE tablename = 'call_logs'
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || policy_record.policyname || '" ON call_logs';
    END LOOP;
    
    -- Drop all policies from conversation_logs
    FOR policy_record IN 
        SELECT policyname FROM pg_policies WHERE tablename = 'conversation_logs'
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || policy_record.policyname || '" ON conversation_logs';
    END LOOP;
END $$;

-- Re-enable RLS
ALTER TABLE call_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_logs ENABLE ROW LEVEL SECURITY;

-- Create fresh policies for call_logs
CREATE POLICY "call_logs_select_policy"
  ON call_logs
  FOR SELECT
  TO authenticated
  USING (clinic_id IN (
    SELECT clinic_users.clinic_id
    FROM clinic_users
    WHERE clinic_users.user_id = auth.uid() AND clinic_users.is_active = true
  ));

CREATE POLICY "call_logs_insert_policy"
  ON call_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "call_logs_update_policy"
  ON call_logs
  FOR UPDATE
  TO authenticated
  USING (true);

-- Create fresh policies for conversation_logs
CREATE POLICY "conversation_logs_select_policy"
  ON conversation_logs
  FOR SELECT
  TO authenticated
  USING (clinic_id IN (
    SELECT clinic_users.clinic_id
    FROM clinic_users
    WHERE clinic_users.user_id = auth.uid() AND clinic_users.is_active = true
  ));

CREATE POLICY "conversation_logs_insert_policy"
  ON conversation_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Grant permissions
GRANT ALL ON call_logs TO authenticated;
GRANT ALL ON conversation_logs TO authenticated;