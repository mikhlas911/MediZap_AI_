import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { PatientAppointmentBooking } from '../components/patient/PatientAppointmentBooking';
import { supabase } from '../lib/supabase';
import { AlertCircle, Building2 } from 'lucide-react';

export function PatientBookingPage() {
  const { clinicSlug } = useParams();
  const [clinic, setClinic] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    fetchClinicBySlug();
  }, [clinicSlug]);

  const fetchClinicBySlug = async () => {
    if (!clinicSlug) {
      setError('No clinic specified');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('clinics')
        .select('id, name, phone, address, email, is_active')
        .eq('slug', clinicSlug)
        .eq('is_active', true)
        .single();

      if (error) throw error;

      if (!data) {
        setError('Clinic not found or inactive');
        return;
      }

      setClinic(data);
    } catch (err: any) {
      console.error('Error fetching clinic:', err);
      setError('Unable to load clinic information');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto mb-4"></div>
          <p className="text-slate-600">Loading clinic information...</p>
        </div>
      </div>
    );
  }

  if (error || !clinic) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full text-center">
          <div className="bg-white rounded-xl shadow-lg p-8">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-slate-800 mb-2">Clinic Not Available</h2>
            <p className="text-slate-600 mb-6">{error}</p>
            <div className="flex items-center justify-center space-x-2 text-sm text-slate-500">
              <Building2 className="h-4 w-4" />
              <span>Please check the clinic URL or contact support</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <PatientAppointmentBooking
      clinicId={clinic.id}
      clinicName={clinic.name}
      userType="guest"
    />
  );
}