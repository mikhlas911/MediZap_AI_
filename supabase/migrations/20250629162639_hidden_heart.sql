/*
  # Fix appointment ID generation function

  1. Changes
    - Update `generate_next_appointment_id()` function to reference correct table name
    - Change `appointments_temp` to `appointments` in the function body

  2. Security
    - Function maintains existing security model
    - No changes to permissions or RLS policies
*/

CREATE OR REPLACE FUNCTION "public"."generate_next_appointment_id"() RETURNS "text"
    LANGUAGE "plpgsql"
    AS $_$
DECLARE
    max_num INTEGER;
    new_id TEXT;
BEGIN
    -- Get the highest existing appointment number
    SELECT COALESCE(MAX(CAST(SUBSTRING(id FROM 2) AS INTEGER)), 0) + 1
    INTO max_num
    FROM appointments
    WHERE id ~ '^A[0-9]{4}$';
    
    -- Generate new ID
    new_id := 'A' || LPAD(max_num::TEXT, 4, '0');
    
    RETURN new_id;
END;
$_$;