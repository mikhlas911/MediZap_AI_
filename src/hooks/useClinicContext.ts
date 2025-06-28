import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../components/auth/AuthProvider';

interface ClinicContext {
  clinicId: string | null;
  clinicName: string | null;
  userRole: string | null;
  loading: boolean;
  error: string | null;
}

export function useClinicContext(): ClinicContext {
  const { user } = useAuth();
  const [context, setContext] = useState<ClinicContext>({
    clinicId: null,
    clinicName: null,
    userRole: null,
    loading: true,
    error: null
  });

  useEffect(() => {
    if (!user) {
      setContext({
        clinicId: null,
        clinicName: null,
        userRole: null,
        loading: false,
        error: null
      });
      return;
    }

    async function fetchClinicContext() {
      try {
        // Get user's clinic association
        const { data: clinicUser, error: clinicUserError } = await supabase
          .from('clinic_users')
          .select(`
            clinic_id,
            role,
            is_active,
            clinic:clinics(id, name, clinicname)
          `)
          .eq('user_id', user.id)
          .eq('is_active', true)
          .maybeSingle();

        if (clinicUserError) {
          throw clinicUserError;
        }

        if (!clinicUser) {
          // No clinic association found
          setContext({
            clinicId: null,
            clinicName: null,
            userRole: null,
            loading: false,
            error: 'No clinic association found'
          });
          return;
        }

        setContext({
          clinicId: clinicUser.clinic_id,
          clinicName: clinicUser.clinic?.name || clinicUser.clinic?.clinicname || null,
          userRole: clinicUser.role,
          loading: false,
          error: null
        });
      } catch (err: any) {
        setContext({
          clinicId: null,
          clinicName: null,
          userRole: null,
          loading: false,
          error: err.message || 'Failed to load clinic context'
        });
      }
    }

    fetchClinicContext();
  }, [user]);

  return context;
}