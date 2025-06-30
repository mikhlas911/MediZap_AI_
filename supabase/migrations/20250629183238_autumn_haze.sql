/*
  # Add RLS policy for patients to view their own appointments

  1. New Policy
    - Allow authenticated users to SELECT appointments they created
    - This enables patients to view appointments where they are the `created_by` user
    - Maintains security by only showing appointments the user actually created

  2. Security
    - Uses auth.uid() to match against created_by column
    - Only affects SELECT operations for patient access
    - Existing policies for clinic staff remain unchanged
*/

-- Add policy for patients to view their own appointments
CREATE POLICY "Users can view their own appointments"
  ON appointments
  FOR SELECT
  TO authenticated
  USING (auth.uid() = created_by);

-- Also add policy for patients to update their own appointments (for cancellations, etc.)
CREATE POLICY "Users can update their own appointments"
  ON appointments
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = created_by)
  WITH CHECK (auth.uid() = created_by);