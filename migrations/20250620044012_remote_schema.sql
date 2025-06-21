create table "public"."call_logs" (
    "id" uuid not null default gen_random_uuid(),
    "clinic_id" uuid,
    "call_sid" text,
    "caller_phone" text not null,
    "call_duration" integer default 0,
    "call_summary" text,
    "appointment_booked" boolean default false,
    "created_at" timestamp with time zone default now()
);


alter table "public"."call_logs" enable row level security;

create table "public"."conversation_logs" (
    "id" uuid not null default gen_random_uuid(),
    "clinic_id" uuid,
    "call_sid" text,
    "caller_phone" text not null,
    "conversation_step" text,
    "user_input" text,
    "agent_response" text,
    "created_at" timestamp with time zone default now()
);


alter table "public"."conversation_logs" enable row level security;

alter table "public"."doctors" drop column "email";

CREATE UNIQUE INDEX call_logs_pkey ON public.call_logs USING btree (id);

CREATE UNIQUE INDEX conversation_logs_pkey ON public.conversation_logs USING btree (id);

CREATE INDEX idx_call_logs_call_sid ON public.call_logs USING btree (call_sid);

CREATE INDEX idx_call_logs_clinic_id ON public.call_logs USING btree (clinic_id);

CREATE INDEX idx_call_logs_created_at ON public.call_logs USING btree (created_at);

CREATE INDEX idx_conversation_logs_call_sid ON public.conversation_logs USING btree (call_sid);

CREATE INDEX idx_conversation_logs_clinic_id ON public.conversation_logs USING btree (clinic_id);

CREATE INDEX idx_conversation_logs_created_at ON public.conversation_logs USING btree (created_at);

CREATE INDEX idx_doctors_specialization ON public.doctors USING btree (specialization);

alter table "public"."call_logs" add constraint "call_logs_pkey" PRIMARY KEY using index "call_logs_pkey";

alter table "public"."conversation_logs" add constraint "conversation_logs_pkey" PRIMARY KEY using index "conversation_logs_pkey";

alter table "public"."call_logs" add constraint "call_logs_clinic_id_fkey" FOREIGN KEY (clinic_id) REFERENCES clinics(id) ON DELETE CASCADE not valid;

alter table "public"."call_logs" validate constraint "call_logs_clinic_id_fkey";

alter table "public"."conversation_logs" add constraint "conversation_logs_clinic_id_fkey" FOREIGN KEY (clinic_id) REFERENCES clinics(id) ON DELETE CASCADE not valid;

alter table "public"."conversation_logs" validate constraint "conversation_logs_clinic_id_fkey";

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.sync_doctor_specialization()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  -- Get the department name and set it as specialization
  IF NEW.department_id IS NOT NULL THEN
    SELECT name INTO NEW.specialization
    FROM departments
    WHERE id = NEW.department_id;
  END IF;
  
  RETURN NEW;
END;
$function$
;

grant delete on table "public"."call_logs" to "anon";

grant insert on table "public"."call_logs" to "anon";

grant references on table "public"."call_logs" to "anon";

grant select on table "public"."call_logs" to "anon";

grant trigger on table "public"."call_logs" to "anon";

grant truncate on table "public"."call_logs" to "anon";

grant update on table "public"."call_logs" to "anon";

grant delete on table "public"."call_logs" to "authenticated";

grant insert on table "public"."call_logs" to "authenticated";

grant references on table "public"."call_logs" to "authenticated";

grant select on table "public"."call_logs" to "authenticated";

grant trigger on table "public"."call_logs" to "authenticated";

grant truncate on table "public"."call_logs" to "authenticated";

grant update on table "public"."call_logs" to "authenticated";

grant delete on table "public"."call_logs" to "service_role";

grant insert on table "public"."call_logs" to "service_role";

grant references on table "public"."call_logs" to "service_role";

grant select on table "public"."call_logs" to "service_role";

grant trigger on table "public"."call_logs" to "service_role";

grant truncate on table "public"."call_logs" to "service_role";

grant update on table "public"."call_logs" to "service_role";

grant delete on table "public"."conversation_logs" to "anon";

grant insert on table "public"."conversation_logs" to "anon";

grant references on table "public"."conversation_logs" to "anon";

grant select on table "public"."conversation_logs" to "anon";

grant trigger on table "public"."conversation_logs" to "anon";

grant truncate on table "public"."conversation_logs" to "anon";

grant update on table "public"."conversation_logs" to "anon";

grant delete on table "public"."conversation_logs" to "authenticated";

grant insert on table "public"."conversation_logs" to "authenticated";

grant references on table "public"."conversation_logs" to "authenticated";

grant select on table "public"."conversation_logs" to "authenticated";

grant trigger on table "public"."conversation_logs" to "authenticated";

grant truncate on table "public"."conversation_logs" to "authenticated";

grant update on table "public"."conversation_logs" to "authenticated";

grant delete on table "public"."conversation_logs" to "service_role";

grant insert on table "public"."conversation_logs" to "service_role";

grant references on table "public"."conversation_logs" to "service_role";

grant select on table "public"."conversation_logs" to "service_role";

grant trigger on table "public"."conversation_logs" to "service_role";

grant truncate on table "public"."conversation_logs" to "service_role";

grant update on table "public"."conversation_logs" to "service_role";

create policy "Clinic staff can view call logs"
on "public"."call_logs"
as permissive
for select
to authenticated
using ((clinic_id IN ( SELECT clinic_users.clinic_id
   FROM clinic_users
  WHERE ((clinic_users.user_id = auth.uid()) AND (clinic_users.is_active = true)))));


create policy "System can insert call logs"
on "public"."call_logs"
as permissive
for insert
to authenticated
with check (true);


create policy "System can update call logs"
on "public"."call_logs"
as permissive
for update
to authenticated
using (true);


create policy "Authenticated users can create clinics"
on "public"."clinics"
as permissive
for insert
to authenticated
with check (true);


create policy "Clinic staff can view conversation logs"
on "public"."conversation_logs"
as permissive
for select
to authenticated
using ((clinic_id IN ( SELECT clinic_users.clinic_id
   FROM clinic_users
  WHERE ((clinic_users.user_id = auth.uid()) AND (clinic_users.is_active = true)))));


create policy "System can insert conversation logs"
on "public"."conversation_logs"
as permissive
for insert
to authenticated
with check (true);


CREATE TRIGGER sync_doctor_specialization_trigger BEFORE INSERT OR UPDATE OF department_id ON public.doctors FOR EACH ROW EXECUTE FUNCTION sync_doctor_specialization();


