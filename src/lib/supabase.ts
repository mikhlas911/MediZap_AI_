import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Types for our database
export interface User {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  full_name: string;
  avatar_url?: string;
  created_at: string;
  updated_at: string;
}

export interface Clinic {
  id: string;
  name: string;
  email: string;
  phone?: string;
  address?: string;
  website?: string;
  logo_url?: string;
  subscription_plan: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ClinicUser {
  id: string;
  clinic_id: string;
  user_id: string;
  role: 'admin' | 'staff' | 'doctor';
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Department {
  id: string;
  clinic_id: string;
  name: string;
  description?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Doctor {
  id: string;
  clinic_id: string;
  department_id: string;
  name: string;
  specialization?: string; // This will be automatically set from department name
  phone?: string;
  available_days: string[];
  available_times: string[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Appointment {
  id: string;
  clinic_id: string;
  patient_name: string;
  phone_number?: string;
  email?: string;
  doctor_id: string;
  department_id: string;
  appointment_date: string;
  appointment_time: string;
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed';
  notes?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface CallLog {
  id: string;
  clinic_id: string;
  caller_phone: string;
  call_duration: number;
  call_summary: string;
  appointment_booked: boolean;
  created_at: string;
}