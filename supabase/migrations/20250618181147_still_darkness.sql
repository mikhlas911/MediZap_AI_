/*
  # Create call logs and conversation logs tables

  1. New Tables
    - `call_logs`
      - `id` (uuid, primary key)
      - `clinic_id` (uuid, foreign key to clinics)
      - `call_sid` (text, Twilio call identifier)
      - `caller_phone` (text)
      - `call_duration` (integer, seconds)
      - `call_summary` (text)
      - `appointment_booked` (boolean)
      - `created_at` (timestamp)
    
    - `conversation_logs`
      - `id` (uuid, primary key)
      - `clinic_id` (uuid, foreign key to clinics)
      - `call_sid` (text, Twilio call identifier)
      - `caller_phone` (text)
      - `conversation_step` (text)
      - `user_input` (text)
      - `agent_response` (text)
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on both tables
    - Add policies for clinic staff to view their clinic's logs
*/

-- Create call_logs table
CREATE TABLE IF NOT EXISTS call_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id uuid REFERENCES clinics(id) ON DELETE CASCADE,
  call_sid text,
  caller_phone text NOT NULL,
  call_duration integer DEFAULT 0,
  call_summary text,
  appointment_booked boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Create conversation_logs table
CREATE TABLE IF NOT EXISTS conversation_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id uuid REFERENCES clinics(id) ON DELETE CASCADE,
  call_sid text,
  caller_phone text NOT NULL,
  conversation_step text,
  user_input text,
  agent_response text,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE call_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_logs ENABLE ROW LEVEL SECURITY;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_call_logs_clinic_id ON call_logs(clinic_id);
CREATE INDEX IF NOT EXISTS idx_call_logs_call_sid ON call_logs(call_sid);
CREATE INDEX IF NOT EXISTS idx_call_logs_created_at ON call_logs(created_at);

CREATE INDEX IF NOT EXISTS idx_conversation_logs_clinic_id ON conversation_logs(clinic_id);
CREATE INDEX IF NOT EXISTS idx_conversation_logs_call_sid ON conversation_logs(call_sid);
CREATE INDEX IF NOT EXISTS idx_conversation_logs_created_at ON conversation_logs(created_at);

-- RLS Policies for call_logs
CREATE POLICY "Clinic staff can view call logs"
  ON call_logs
  FOR SELECT
  TO authenticated
  USING (clinic_id IN (
    SELECT clinic_users.clinic_id
    FROM clinic_users
    WHERE clinic_users.user_id = auth.uid() AND clinic_users.is_active = true
  ));

CREATE POLICY "System can insert call logs"
  ON call_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "System can update call logs"
  ON call_logs
  FOR UPDATE
  TO authenticated
  USING (true);

-- RLS Policies for conversation_logs
CREATE POLICY "Clinic staff can view conversation logs"
  ON conversation_logs
  FOR SELECT
  TO authenticated
  USING (clinic_id IN (
    SELECT clinic_users.clinic_id
    FROM clinic_users
    WHERE clinic_users.user_id = auth.uid() AND clinic_users.is_active = true
  ));

CREATE POLICY "System can insert conversation logs"
  ON conversation_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (true);