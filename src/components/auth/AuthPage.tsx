import React, { useState } from 'react';
import { LoginForm } from './LoginForm';
import { ClinicRegistrationForm } from './ClinicRegistrationForm';
import { ForgotPasswordForm } from './ForgotPasswordForm';

type AuthMode = 'login' | 'register' | 'forgot-password';

export function AuthPage() {
  const [mode, setMode] = useState<AuthMode>('login');

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="w-full">
        {mode === 'login' && (
          <LoginForm
            onSwitchToRegister={() => setMode('register')}
            onSwitchToForgotPassword={() => setMode('forgot-password')}
          />
        )}
        {mode === 'register' && (
          <ClinicRegistrationForm
            onSwitchToLogin={() => setMode('login')}
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