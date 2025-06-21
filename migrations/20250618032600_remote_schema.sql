

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";






CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE TYPE "public"."appointment_status" AS ENUM (
    'confirmed',
    'pending',
    'cancelled',
    'completed'
);


ALTER TYPE "public"."appointment_status" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_clinic_with_admin"("clinic_name" "text", "clinic_email" "text", "clinic_phone" "text" DEFAULT NULL::"text", "clinic_address" "text" DEFAULT NULL::"text", "clinic_website" "text" DEFAULT NULL::"text") RETURNS json
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  new_clinic_id uuid;
  current_user_id uuid;
  result json;
BEGIN
  -- Get the current user ID
  current_user_id := auth.uid();
  
  -- Check if user is authenticated
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'User must be authenticated to create a clinic';
  END IF;

  -- Validate required fields
  IF clinic_name IS NULL OR trim(clinic_name) = '' THEN
    RAISE EXCEPTION 'Clinic name is required';
  END IF;
  
  IF clinic_email IS NULL OR trim(clinic_email) = '' THEN
    RAISE EXCEPTION 'Clinic email is required';
  END IF;

  -- Check if clinic with this email already exists
  IF EXISTS (SELECT 1 FROM clinics WHERE email = clinic_email) THEN
    RAISE EXCEPTION 'A clinic with this email already exists';
  END IF;

  -- Create the clinic
  INSERT INTO clinics (name, email, phone, address, website)
  VALUES (clinic_name, clinic_email, clinic_phone, clinic_address, clinic_website)
  RETURNING id INTO new_clinic_id;

  -- Add the current user as admin of the clinic
  INSERT INTO clinic_users (clinic_id, user_id, role, is_active)
  VALUES (new_clinic_id, current_user_id, 'admin', true);

  -- Create default departments for the clinic
  INSERT INTO departments (clinic_id, name, description, is_active)
  VALUES 
    (new_clinic_id, 'General Medicine', 'General medical consultations and check-ups', true),
    (new_clinic_id, 'Pediatrics', 'Medical care for infants, children, and adolescents', true),
    (new_clinic_id, 'Cardiology', 'Heart and cardiovascular system care', true),
    (new_clinic_id, 'Dermatology', 'Skin, hair, and nail care', true),
    (new_clinic_id, 'Orthopedics', 'Bone, joint, and muscle care', true);

  -- Return success result
  result := json_build_object(
    'success', true,
    'clinic_id', new_clinic_id,
    'message', 'Clinic created successfully with default departments'
  );

  RETURN result;

EXCEPTION
  WHEN OTHERS THEN
    -- Return error details
    RAISE EXCEPTION 'Failed to create clinic: %', SQLERRM;
END;
$$;


ALTER FUNCTION "public"."create_clinic_with_admin"("clinic_name" "text", "clinic_email" "text", "clinic_phone" "text", "clinic_address" "text", "clinic_website" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."create_clinic_with_admin"("clinic_name" "text", "clinic_email" "text", "clinic_phone" "text", "clinic_address" "text", "clinic_website" "text") IS 'Secure function for creating clinics with proper validation and automatic admin assignment. This bypasses RLS INSERT restrictions while maintaining security through application-level controls.';



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
    FROM appointments_temp
    WHERE id ~ '^A[0-9]{4}$';
    
    -- Generate new ID
    new_id := 'A' || LPAD(max_num::TEXT, 4, '0');
    
    RETURN new_id;
END;
$_$;


ALTER FUNCTION "public"."generate_next_appointment_id"() OWNER TO "postgres";


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
    FROM departments
    WHERE id ~ '^D[0-9]{4}$';
    
    -- Generate new ID
    new_id := 'D' || LPAD(max_num::TEXT, 4, '0');
    
    RETURN new_id;
END;
$_$;


ALTER FUNCTION "public"."generate_next_department_id"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_user_admin_clinic_ids"("target_user_id" "uuid") RETURNS TABLE("clinic_id" "uuid")
    LANGUAGE "sql" STABLE SECURITY DEFINER
    AS $$
  SELECT cu.clinic_id 
  FROM clinic_users cu 
  WHERE cu.user_id = target_user_id 
    AND cu.role = 'admin' 
    AND cu.is_active = true;
$$;


ALTER FUNCTION "public"."get_user_admin_clinic_ids"("target_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_user_clinic_ids"("target_user_id" "uuid") RETURNS TABLE("clinic_id" "uuid")
    LANGUAGE "sql" STABLE SECURITY DEFINER
    AS $$
  SELECT cu.clinic_id 
  FROM clinic_users cu 
  WHERE cu.user_id = target_user_id 
    AND cu.is_active = true;
$$;


ALTER FUNCTION "public"."get_user_clinic_ids"("target_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_new_user_signup"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  -- Insert a new row into the users table when a new user signs up
  INSERT INTO public.users (
    id,
    email,
    first_name,
    last_name,
    full_name,
    created_at,
    updated_at
  )
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'first_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'last_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    NOW(),
    NOW()
  );
  
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."handle_new_user_signup"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_updated_at_column"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_updated_at_column"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."appointments" (
    "id" "text" DEFAULT "public"."generate_next_appointment_id"() NOT NULL,
    "clinic_id" "uuid",
    "patient_name" "text" NOT NULL,
    "phone_number" "text",
    "email" "text",
    "doctor_id" "uuid",
    "department_id" "text",
    "appointment_date" "date" NOT NULL,
    "appointment_time" "text" NOT NULL,
    "status" "text" DEFAULT 'pending'::"text",
    "notes" "text",
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "appointments_new_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'confirmed'::"text", 'cancelled'::"text", 'completed'::"text"])))
);


ALTER TABLE "public"."appointments" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."clinic_users" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "clinic_id" "uuid",
    "user_id" "uuid",
    "role" "text" DEFAULT 'staff'::"text",
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "clinic_users_role_check" CHECK (("role" = ANY (ARRAY['admin'::"text", 'staff'::"text", 'doctor'::"text"])))
);


ALTER TABLE "public"."clinic_users" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."clinics" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "email" "text" NOT NULL,
    "phone" "text",
    "address" "text",
    "website" "text",
    "logo_url" "text",
    "subscription_plan" "text" DEFAULT 'basic'::"text",
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."clinics" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."departments" (
    "id" "text" DEFAULT "public"."generate_next_department_id"() NOT NULL,
    "clinic_id" "uuid",
    "name" "text" NOT NULL,
    "description" "text",
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."departments" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."doctors" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "clinic_id" "uuid",
    "department_id" "text",
    "name" "text" NOT NULL,
    "specialization" "text",
    "email" "text",
    "phone" "text",
    "available_days" "text"[] DEFAULT '{}'::"text"[],
    "available_times" "text"[] DEFAULT '{}'::"text"[],
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."doctors" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."users" (
    "id" "uuid" NOT NULL,
    "email" "text" NOT NULL,
    "first_name" "text",
    "last_name" "text",
    "full_name" "text",
    "avatar_url" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."users" OWNER TO "postgres";


ALTER TABLE ONLY "public"."appointments"
    ADD CONSTRAINT "appointments_new_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."clinic_users"
    ADD CONSTRAINT "clinic_users_clinic_id_user_id_key" UNIQUE ("clinic_id", "user_id");



ALTER TABLE ONLY "public"."clinic_users"
    ADD CONSTRAINT "clinic_users_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."clinics"
    ADD CONSTRAINT "clinics_email_key" UNIQUE ("email");



ALTER TABLE ONLY "public"."clinics"
    ADD CONSTRAINT "clinics_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."departments"
    ADD CONSTRAINT "departments_new_clinic_id_name_key" UNIQUE ("clinic_id", "name");



ALTER TABLE ONLY "public"."departments"
    ADD CONSTRAINT "departments_new_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."doctors"
    ADD CONSTRAINT "doctors_new_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_email_key" UNIQUE ("email");



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_pkey" PRIMARY KEY ("id");



CREATE INDEX "idx_appointments_clinic_date" ON "public"."appointments" USING "btree" ("clinic_id", "appointment_date");



CREATE INDEX "idx_appointments_clinic_id" ON "public"."appointments" USING "btree" ("clinic_id");



CREATE INDEX "idx_appointments_date" ON "public"."appointments" USING "btree" ("appointment_date");



CREATE INDEX "idx_appointments_doctor_id" ON "public"."appointments" USING "btree" ("doctor_id");



CREATE INDEX "idx_appointments_status" ON "public"."appointments" USING "btree" ("status");



CREATE INDEX "idx_clinic_users_admin_lookup" ON "public"."clinic_users" USING "btree" ("clinic_id", "role") WHERE (("role" = 'admin'::"text") AND ("is_active" = true));



CREATE INDEX "idx_clinic_users_clinic_admin_fast" ON "public"."clinic_users" USING "btree" ("clinic_id", "user_id") WHERE (("role" = 'admin'::"text") AND ("is_active" = true));



CREATE INDEX "idx_clinic_users_clinic_id" ON "public"."clinic_users" USING "btree" ("clinic_id");



CREATE INDEX "idx_clinic_users_clinic_user_lookup" ON "public"."clinic_users" USING "btree" ("user_id", "clinic_id", "is_active");



CREATE INDEX "idx_clinic_users_user_clinic_active" ON "public"."clinic_users" USING "btree" ("user_id", "clinic_id") WHERE ("is_active" = true);



CREATE INDEX "idx_clinic_users_user_id" ON "public"."clinic_users" USING "btree" ("user_id") WHERE ("is_active" = true);



CREATE INDEX "idx_clinic_users_user_id_active" ON "public"."clinic_users" USING "btree" ("user_id", "is_active");



CREATE INDEX "idx_clinic_users_user_id_active_fast" ON "public"."clinic_users" USING "btree" ("user_id") WHERE ("is_active" = true);



CREATE INDEX "idx_clinics_email" ON "public"."clinics" USING "btree" ("email");



CREATE INDEX "idx_clinics_email_fast" ON "public"."clinics" USING "btree" ("email") WHERE ("is_active" = true);



CREATE INDEX "idx_departments_clinic_active" ON "public"."departments" USING "btree" ("clinic_id") WHERE ("is_active" = true);



CREATE INDEX "idx_departments_clinic_id" ON "public"."departments" USING "btree" ("clinic_id");



CREATE INDEX "idx_doctors_clinic_active" ON "public"."doctors" USING "btree" ("clinic_id") WHERE ("is_active" = true);



CREATE INDEX "idx_doctors_clinic_id" ON "public"."doctors" USING "btree" ("clinic_id");



CREATE INDEX "idx_doctors_department_id" ON "public"."doctors" USING "btree" ("department_id");



CREATE INDEX "idx_users_email" ON "public"."users" USING "btree" ("email");



CREATE INDEX "idx_users_full_name" ON "public"."users" USING "btree" ("full_name");



CREATE OR REPLACE TRIGGER "update_appointments_updated_at" BEFORE UPDATE ON "public"."appointments" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_clinic_users_updated_at" BEFORE UPDATE ON "public"."clinic_users" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_clinics_updated_at" BEFORE UPDATE ON "public"."clinics" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_departments_updated_at" BEFORE UPDATE ON "public"."departments" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_doctors_updated_at" BEFORE UPDATE ON "public"."doctors" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_users_updated_at" BEFORE UPDATE ON "public"."users" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



ALTER TABLE ONLY "public"."appointments"
    ADD CONSTRAINT "appointments_new_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "public"."clinics"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."appointments"
    ADD CONSTRAINT "appointments_new_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."appointments"
    ADD CONSTRAINT "appointments_new_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "public"."departments"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."appointments"
    ADD CONSTRAINT "appointments_new_doctor_id_fkey" FOREIGN KEY ("doctor_id") REFERENCES "public"."doctors"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."clinic_users"
    ADD CONSTRAINT "clinic_users_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "public"."clinics"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."clinic_users"
    ADD CONSTRAINT "clinic_users_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."departments"
    ADD CONSTRAINT "departments_new_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "public"."clinics"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."doctors"
    ADD CONSTRAINT "doctors_new_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "public"."clinics"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."doctors"
    ADD CONSTRAINT "doctors_new_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "public"."departments"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



CREATE POLICY "Admins can delete clinic_users" ON "public"."clinic_users" FOR DELETE TO "authenticated" USING (("clinic_id" IN ( SELECT "public"."get_user_admin_clinic_ids"("auth"."uid"()) AS "get_user_admin_clinic_ids")));



CREATE POLICY "Admins can delete their clinic" ON "public"."clinics" FOR DELETE TO "authenticated" USING (("id" IN ( SELECT "clinic_users"."clinic_id"
   FROM "public"."clinic_users"
  WHERE (("clinic_users"."user_id" = "auth"."uid"()) AND ("clinic_users"."role" = 'admin'::"text")))));



CREATE POLICY "Admins can update clinic_users" ON "public"."clinic_users" FOR UPDATE TO "authenticated" USING (("clinic_id" IN ( SELECT "public"."get_user_admin_clinic_ids"("auth"."uid"()) AS "get_user_admin_clinic_ids"))) WITH CHECK (("clinic_id" IN ( SELECT "public"."get_user_admin_clinic_ids"("auth"."uid"()) AS "get_user_admin_clinic_ids")));



CREATE POLICY "Allow public insert access to appointments" ON "public"."appointments" FOR INSERT WITH CHECK (true);



CREATE POLICY "Allow public read access to active departments" ON "public"."departments" FOR SELECT USING (("is_active" = true));



CREATE POLICY "Allow public read access to active doctors" ON "public"."doctors" FOR SELECT USING (("is_active" = true));



CREATE POLICY "Authenticated users can manage departments" ON "public"."departments" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."clinic_users" "cu"
  WHERE (("cu"."clinic_id" = "departments"."clinic_id") AND ("cu"."user_id" = "auth"."uid"()) AND ("cu"."role" = ANY (ARRAY['admin'::"text", 'staff'::"text"])) AND ("cu"."is_active" = true)))));



CREATE POLICY "Authenticated users can manage doctors" ON "public"."doctors" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."clinic_users" "cu"
  WHERE (("cu"."clinic_id" = "doctors"."clinic_id") AND ("cu"."user_id" = "auth"."uid"()) AND ("cu"."role" = ANY (ARRAY['admin'::"text", 'staff'::"text"])) AND ("cu"."is_active" = true)))));



CREATE POLICY "Users can insert own clinic_user record" ON "public"."clinic_users" FOR INSERT TO "authenticated" WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "Users can insert own profile" ON "public"."users" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() = "id"));



CREATE POLICY "Users can manage appointments in their clinic" ON "public"."appointments" TO "authenticated" USING (("clinic_id" IN ( SELECT "clinic_users"."clinic_id"
   FROM "public"."clinic_users"
  WHERE ("clinic_users"."user_id" = "auth"."uid"()))));



CREATE POLICY "Users can read own data" ON "public"."users" FOR SELECT TO "authenticated" USING (("auth"."uid"() = "id"));



CREATE POLICY "Users can update own data" ON "public"."users" FOR UPDATE TO "authenticated" USING (("auth"."uid"() = "id")) WITH CHECK (("auth"."uid"() = "id"));



CREATE POLICY "Users can update their own clinic" ON "public"."clinics" FOR UPDATE TO "authenticated" USING (("id" IN ( SELECT "clinic_users"."clinic_id"
   FROM "public"."clinic_users"
  WHERE (("clinic_users"."user_id" = "auth"."uid"()) AND ("clinic_users"."role" = 'admin'::"text")))));



CREATE POLICY "Users can view appointments in their clinic" ON "public"."appointments" FOR SELECT TO "authenticated" USING (("clinic_id" IN ( SELECT "clinic_users"."clinic_id"
   FROM "public"."clinic_users"
  WHERE (("clinic_users"."user_id" = "auth"."uid"()) AND ("clinic_users"."is_active" = true)))));



CREATE POLICY "Users can view clinic_users in their clinics" ON "public"."clinic_users" FOR SELECT TO "authenticated" USING (("clinic_id" IN ( SELECT "public"."get_user_clinic_ids"("auth"."uid"()) AS "get_user_clinic_ids")));



CREATE POLICY "Users can view own clinic_user record" ON "public"."clinic_users" FOR SELECT TO "authenticated" USING (("user_id" = "auth"."uid"()));



CREATE POLICY "Users can view their own clinic" ON "public"."clinics" FOR SELECT TO "authenticated" USING (("id" IN ( SELECT "clinic_users"."clinic_id"
   FROM "public"."clinic_users"
  WHERE ("clinic_users"."user_id" = "auth"."uid"()))));



ALTER TABLE "public"."appointments" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."clinic_users" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."clinics" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."departments" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."doctors" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."users" ENABLE ROW LEVEL SECURITY;




ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";






GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";

























































































































































GRANT ALL ON FUNCTION "public"."create_clinic_with_admin"("clinic_name" "text", "clinic_email" "text", "clinic_phone" "text", "clinic_address" "text", "clinic_website" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."create_clinic_with_admin"("clinic_name" "text", "clinic_email" "text", "clinic_phone" "text", "clinic_address" "text", "clinic_website" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_clinic_with_admin"("clinic_name" "text", "clinic_email" "text", "clinic_phone" "text", "clinic_address" "text", "clinic_website" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."generate_next_appointment_id"() TO "anon";
GRANT ALL ON FUNCTION "public"."generate_next_appointment_id"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."generate_next_appointment_id"() TO "service_role";



GRANT ALL ON FUNCTION "public"."generate_next_department_id"() TO "anon";
GRANT ALL ON FUNCTION "public"."generate_next_department_id"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."generate_next_department_id"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_user_admin_clinic_ids"("target_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_user_admin_clinic_ids"("target_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_user_admin_clinic_ids"("target_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_user_clinic_ids"("target_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_user_clinic_ids"("target_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_user_clinic_ids"("target_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_new_user_signup"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_user_signup"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_user_signup"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "service_role";


















GRANT ALL ON TABLE "public"."appointments" TO "anon";
GRANT ALL ON TABLE "public"."appointments" TO "authenticated";
GRANT ALL ON TABLE "public"."appointments" TO "service_role";



GRANT ALL ON TABLE "public"."clinic_users" TO "anon";
GRANT ALL ON TABLE "public"."clinic_users" TO "authenticated";
GRANT ALL ON TABLE "public"."clinic_users" TO "service_role";



GRANT ALL ON TABLE "public"."clinics" TO "anon";
GRANT ALL ON TABLE "public"."clinics" TO "authenticated";
GRANT ALL ON TABLE "public"."clinics" TO "service_role";



GRANT ALL ON TABLE "public"."departments" TO "anon";
GRANT ALL ON TABLE "public"."departments" TO "authenticated";
GRANT ALL ON TABLE "public"."departments" TO "service_role";



GRANT ALL ON TABLE "public"."doctors" TO "anon";
GRANT ALL ON TABLE "public"."doctors" TO "authenticated";
GRANT ALL ON TABLE "public"."doctors" TO "service_role";



GRANT ALL ON TABLE "public"."users" TO "anon";
GRANT ALL ON TABLE "public"."users" TO "authenticated";
GRANT ALL ON TABLE "public"."users" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";






























RESET ALL;
