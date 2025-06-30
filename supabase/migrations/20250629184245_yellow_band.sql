/*
  # Fix Appointment ID Generation with Sequence

  1. Database Changes
    - Create a dedicated sequence for appointment IDs
    - Update the generate_next_appointment_id function to use the sequence
    - Initialize the sequence based on existing appointment IDs
    - Grant necessary permissions

  2. Benefits
    - Atomic ID generation that works reliably under concurrent requests
    - Prevents duplicate key violations during high traffic
    - Maintains the same ID format (A0001, A0002, etc.)
*/

-- Step 1: Find the current maximum numeric ID from the 'appointments' table.
-- This value will be used to initialize the new sequence, ensuring it starts
-- from a number higher than any existing ID.
DO $$
DECLARE
    max_existing_id_num INTEGER;
BEGIN
    SELECT COALESCE(MAX(CAST(SUBSTRING(id FROM 2) AS INTEGER)), 0)
    INTO max_existing_id_num
    FROM public.appointments
    WHERE id ~ '^A[0-9]{4}$'; -- Ensure we only consider IDs in the 'AXXXX' format

    -- Step 2: Create a new sequence for appointment IDs.
    -- The sequence will start from max_existing_id_num + 1.
    EXECUTE 'CREATE SEQUENCE IF NOT EXISTS public.appointment_id_seq
             INCREMENT BY 1
             MINVALUE 1
             NO MAXVALUE
             START WITH ' || (max_existing_id_num + 1) || ';';

    -- Set the sequence's current value to ensure it's correctly initialized
    -- even if it already existed but was at a lower value.
    EXECUTE 'SELECT setval(''public.appointment_id_seq'', ' || max_existing_id_num || ', true);';

    RAISE NOTICE 'Sequence public.appointment_id_seq created/initialized with next value starting from %', (max_existing_id_num + 1);
END $$;

-- Step 3: Modify the generate_next_appointment_id function to use the new sequence.
CREATE OR REPLACE FUNCTION public.generate_next_appointment_id() RETURNS text
    LANGUAGE plpgsql
    AS $$
DECLARE
    next_num INTEGER;
    new_id TEXT;
BEGIN
    -- Get the next unique value from the sequence
    SELECT nextval('public.appointment_id_seq') INTO next_num;
    
    -- Generate new ID with 'A' prefix and leading zeros (e.g., A0001)
    new_id := 'A' || LPAD(next_num::TEXT, 4, '0');
    
    RETURN new_id;
END;
$$;

-- Step 4: Grant usage on the new sequence to the 'public' role.
-- This ensures that the function can access the sequence when called by users.
GRANT USAGE ON SEQUENCE public.appointment_id_seq TO public;
GRANT ALL ON FUNCTION public.generate_next_appointment_id() TO public;