import React from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { AIPatientRegistrationWrapper } from '../components/patient/AIPatientRegistrationWrapper';

export function AIPatientRegistrationPage() {
  const { clinicSlug } = useParams();
  const [searchParams] = useSearchParams();
  
  // Get clinic info from URL parameters if available
  const clinicId = searchParams.get('clinicId');
  const clinicName = searchParams.get('clinicName');

  const handleComplete = (userData: any) => {
    console.log('Patient registration completed:', userData);
    // Could redirect to a success page or dashboard
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 py-8 px-4">
      <AIPatientRegistrationWrapper
        clinicId={clinicId || undefined}
        clinicName={clinicName || undefined}
        onComplete={handleComplete}
      />
    </div>
  );
}

export default AIPatientRegistrationPage;