import { useEffect, useState } from 'react';
import { supabase, type Clinic, type Department, type Doctor, type Appointment } from '../lib/supabase';
import { useClinicContext } from './useClinicContext';

export function useClinics() {
  const [clinics, setClinics] = useState<Clinic[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchClinics() {
      try {
        const { data, error } = await supabase
          .from('clinics')
          .select('*')
          .order('name');

        if (error) throw error;
        setClinics(data || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    }

    fetchClinics();
  }, []);

  return { clinics, loading, error };
}

export function useDepartments() {
  const { clinicId } = useClinicContext();
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDepartments = async () => {
    if (!clinicId) {
      setDepartments([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('departments')
        .select('*')
        .eq('clinic_id', clinicId)
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      setDepartments(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDepartments();
  }, [clinicId]);

  // Set up real-time subscription for departments
  useEffect(() => {
    if (!clinicId) return;

    const subscription = supabase
      .channel('departments')
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'departments',
          filter: `clinic_id=eq.${clinicId}`
        },
        () => {
          fetchDepartments();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [clinicId]);

  return { departments, loading, error, refetch: fetchDepartments };
}

export function useDoctors(departmentId?: string) {
  const { clinicId } = useClinicContext();
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!clinicId) {
      setDoctors([]);
      setLoading(false);
      return;
    }

    async function fetchDoctors() {
      try {
        let query = supabase
          .from('doctors')
          .select('*')
          .eq('clinic_id', clinicId);
        
        if (departmentId) {
          query = query.eq('department_id', departmentId);
        }

        const { data, error } = await query.order('name');

        if (error) throw error;
        setDoctors(data || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    }

    fetchDoctors();

    // Set up real-time subscription for doctors
    const subscription = supabase
      .channel('doctors')
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'doctors',
          filter: `clinic_id=eq.${clinicId}`
        },
        () => {
          fetchDoctors();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [clinicId, departmentId]);

  return { doctors, loading, error };
}

export function useAppointments() {
  const { clinicId } = useClinicContext();
  const [appointments, setAppointments] = useState<(Appointment & {
    doctor: Doctor;
    department: Department;
  })[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!clinicId) {
      setAppointments([]);
      setLoading(false);
      return;
    }

    async function fetchAppointments() {
      try {
        const { data, error } = await supabase
          .from('appointments')
          .select(`
            *,
            doctor:doctors(*),
            department:departments(*)
          `)
          .eq('clinic_id', clinicId)
          .order('appointment_date', { ascending: true })
          .order('appointment_time', { ascending: true });

        if (error) throw error;
        setAppointments(data || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    }

    fetchAppointments();

    // Set up real-time subscription
    const subscription = supabase
      .channel('appointments')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'appointments' },
        () => {
          fetchAppointments();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [clinicId]);

  return { appointments, loading, error };
}