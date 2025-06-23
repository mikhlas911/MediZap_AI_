import React from 'react';
import { useParams } from 'react-router-dom';
import { PatientAppointmentBooking } from '../components/patient/PatientAppointmentBooking';

export function PatientBookingPage() {
  const { clinicSlug } = useParams();
  
  // In a real implementation, you'd fetch clinic data based on the slug
  // For now, we'll use placeholder data
  const clinicData = {
    id: 'clinic-1',
    name: 'Downtown Medical Center',
    slug: clinicSlug || 'downtown-medical-center'
  };

  return (
    <PatientAppointmentBooking
      clinicId={clinicData.id}
      clinicName={clinicData.name}
      userType="guest"
    />
  );
}