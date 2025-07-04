import React, { useRef, useState, useEffect } from 'react';
import ProgrammaticPatientRegistration, { 
  PatientRegistrationAPI, 
  NavigationOptions 
} from './ProgrammaticPatientRegistration';
import { PatientAppointmentBooking } from './PatientAppointmentBooking';
import { AIVoiceOrb } from '../voice/AIVoiceOrb';

interface AIPatientRegistrationWrapperProps {
  clinicId?: string;
  clinicName?: string;
  onComplete?: (userData: any) => void;
}

export function AIPatientRegistrationWrapper({
  clinicId,
  clinicName,
  onComplete
}: AIPatientRegistrationWrapperProps) {
  const registrationRef = useRef<PatientRegistrationAPI>(null);
  const [currentStep, setCurrentStep] = useState<'registration' | 'appointments' | 'walk-ins' | 'faq'>('registration');
  const [userData, setUserData] = useState<any>(null);
  const [showVoiceOrb, setShowVoiceOrb] = useState(false);
  const [selectedClinic, setSelectedClinic] = useState<any>(
    clinicId && clinicName ? { id: clinicId, name: clinicName } : null
  );

  // Add debugging to check if global objects are available
  useEffect(() => {
    console.log('AIPatientRegistrationWrapper: Component mounted');
    
    // Check global objects every second for debugging
    const checkGlobals = () => {
      console.log('Global objects check:', {
        MediZapPatientRegistration: typeof window.MediZapPatientRegistration,
        MediZapNavigation: typeof window.MediZapNavigation,
        timestamp: new Date().toISOString()
      });
    };
    
    // Initial check
    checkGlobals();
    
    // Check every 2 seconds for the first 10 seconds
    const interval = setInterval(checkGlobals, 2000);
    setTimeout(() => clearInterval(interval), 10000);
    
    return () => clearInterval(interval);
  }, []);

  const handleRegistrationSuccess = (userData: any, navigationOptions?: NavigationOptions) => {
    console.log('Registration success:', userData);
    setUserData(userData);
    
    if (navigationOptions) {
      switch (navigationOptions.type) {
        case 'appointments':
          setCurrentStep('appointments');
          if (navigationOptions.clinicId && navigationOptions.clinicName) {
            setSelectedClinic({
              id: navigationOptions.clinicId,
              name: navigationOptions.clinicName
            });
          }
          break;
        case 'walk-ins':
          setCurrentStep('walk-ins');
          break;
        case 'faq':
          setCurrentStep('faq');
          break;
        default:
          onComplete?.(userData);
      }
    } else {
      onComplete?.(userData);
    }
  };

  const handleNavigationRequest = (options: NavigationOptions) => {
    console.log('Navigation request:', options);
    switch (options.type) {
      case 'appointments':
        setCurrentStep('appointments');
        if (options.clinicId && options.clinicName) {
          setSelectedClinic({
            id: options.clinicId,
            name: options.clinicName
          });
        }
        break;
      case 'walk-ins':
        setCurrentStep('walk-ins');
        break;
      case 'faq':
        setCurrentStep('faq');
        setShowVoiceOrb(true);
        break;
      case 'custom':
        if (options.customPath) {
          window.location.href = options.customPath;
        }
        break;
    }
  };

  const handleRegistrationError = (error: string) => {
    console.error('Registration error:', error);
    // Could show a toast notification or handle error display
  };

  // Render based on current step
  switch (currentStep) {
    case 'appointments':
      if (selectedClinic && userData) {
        return (
          <PatientAppointmentBooking
            clinicId={selectedClinic.id}
            clinicName={selectedClinic.name}
            userType="patient"
            patientData={userData}
          />
        );
      }
      break;
    
    case 'walk-ins':
      // Could implement walk-in registration component here
      return (
        <div className="text-center p-8">
          <h2 className="text-2xl font-bold text-slate-800 mb-4">Walk-In Registration</h2>
          <p className="text-slate-600">Walk-in registration feature coming soon...</p>
          <button
            onClick={() => setCurrentStep('registration')}
            className="mt-4 px-4 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-700"
          >
            Back to Registration
          </button>
        </div>
      );
    
    case 'faq':
      return (
        <div className="relative">
          <div className="text-center p-8">
            <h2 className="text-2xl font-bold text-slate-800 mb-4">FAQ Assistant</h2>
            <p className="text-slate-600 mb-6">Ask our AI assistant any questions about our services.</p>
            <button
              onClick={() => setShowVoiceOrb(true)}
              className="px-6 py-3 bg-gradient-to-r from-emerald-600 to-sky-600 text-white rounded-lg hover:from-emerald-700 hover:to-sky-700"
            >
              Start FAQ Chat
            </button>
            <button
              onClick={() => setCurrentStep('registration')}
              className="ml-4 px-4 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-700"
            >
              Back to Registration
            </button>
          </div>
          
          <AIVoiceOrb
            isOpen={showVoiceOrb}
            onClose={() => setShowVoiceOrb(false)}
            clinicId={selectedClinic?.id || 'general'}
            clinicName={selectedClinic?.name || 'MediZap AI'}
            onAppointmentBooked={() => setCurrentStep('appointments')}
            onWalkinRegistered={() => setCurrentStep('walk-ins')}
          />
        </div>
      );
    
    default:
      return (
        <div>
          <ProgrammaticPatientRegistration
            ref={registrationRef}
            onRegistrationSuccess={handleRegistrationSuccess}
            onRegistrationError={handleRegistrationError}
            onNavigationRequest={handleNavigationRequest}
            autoGeneratePassword={true}
            defaultNavigationType="appointments"
            showUI={true}
          />
          
          {/* Debug Panel - Remove this in production */}
          <div className="mt-8 bg-slate-50 rounded-lg p-6 border border-slate-200">
            <h3 className="text-lg font-medium text-slate-800 mb-4">Debug Information</h3>
            <div className="space-y-2 text-sm text-slate-600">
              <p><strong>Current Step:</strong> {currentStep}</p>
              <p><strong>User Data:</strong> {userData ? 'Available' : 'Not set'}</p>
              <p><strong>Selected Clinic:</strong> {selectedClinic ? selectedClinic.name : 'None'}</p>
              <div className="mt-4">
                <button
                  onClick={() => {
                    console.log('Manual global check:', {
                      MediZapPatientRegistration: window.MediZapPatientRegistration,
                      MediZapNavigation: window.MediZapNavigation
                    });
                  }}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 mr-2"
                >
                  Check Global Objects
                </button>
                <button
                  onClick={() => {
                    if (window.MediZapPatientRegistration) {
                      console.log('Form data:', window.MediZapPatientRegistration.getFormData());
                    } else {
                      console.log('MediZapPatientRegistration not available');
                    }
                  }}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                >
                  Get Form Data
                </button>
              </div>
            </div>
          </div>
        </div>
      );
  }

  // Fallback to registration
  return (
    <ProgrammaticPatientRegistration
      ref={registrationRef}
      onRegistrationSuccess={handleRegistrationSuccess}
      onRegistrationError={handleRegistrationError}
      onNavigationRequest={handleNavigationRequest}
      autoGeneratePassword={true}
      defaultNavigationType="appointments"
      showUI={true}
    />
  );
}

export default AIPatientRegistrationWrapper;