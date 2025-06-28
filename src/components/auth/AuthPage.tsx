import React, { useState } from 'react';
import { LoginForm } from './LoginForm';
import { ClinicRegistrationForm } from './ClinicRegistrationForm';
import { ForgotPasswordForm } from './ForgotPasswordForm';
import { GuestAccessForm } from './GuestAccessForm';
import { PatientLoginForm } from './PatientLoginForm';
import { GuestSignupForm } from './GuestSignupForm';

type AuthMode = 'login' | 'register' | 'guest-access' | 'forgot-password' | 'patient-login' | 'patient-signup';

export function AuthPage() {
  const [mode, setMode] = useState<AuthMode>('login');

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="w-full">
        {mode === 'login' && (
          <LoginForm
            onSwitchToRegister={() => setMode('register')}
            onSwitchToGuestAccess={() => setMode('guest-access')}
            onSwitchToForgotPassword={() => setMode('forgot-password')}
            onSwitchToPatientLogin={() => setMode('patient-login')}
          />
        )}
        {mode === 'register' && (
          <ClinicRegistrationForm
            onSwitchToLogin={() => setMode('login')}
          />
        )}
        {mode === 'guest-access' && (
          <GuestAccessForm
            onSwitchToLogin={() => setMode('login')}
          />
        )}
        {mode === 'patient-login' && (
          <PatientLoginForm
            onSwitchToGuestAccess={() => setMode('guest-access')}
            onSwitchToPatientSignup={() => setMode('patient-signup')}
            onSwitchToClinicLogin={() => setMode('login')}
          />
        )}
        {mode === 'patient-signup' && (
          <GuestSignupForm
            onSwitchToLogin={() => setMode('patient-login')}
          />
        )}
        {mode === 'forgot-password' && (
          <ForgotPasswordForm
            onSwitchToLogin={() => setMode('login')}
          />
        )}
      </div>
    </div>
  );
}