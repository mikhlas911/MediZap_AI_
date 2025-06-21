CREATE OR REPLACE FUNCTION "public"."generate_next_department_id"() RETURNS "text"
    LANGUAGE "plpgsql"
    AS $_$
DECLARE
    max_num INTEGER;
    new_id TEXT;
BEGIN
    -- Get the highest existing department number
    SELECT COALESCE(MAX(CAST(SUBSTRING(id FROM 2) AS INTEGER)), 1000) + 1
    INTO max_num
    FROM departments -- Changed from departments_temp
    WHERE id ~ '^D[0-9]{4}$';
    
    -- Generate new ID
    new_id := 'D' || LPAD(max_num::TEXT, 4, '0');
    
    RETURN new_id;
END;
$_$;
