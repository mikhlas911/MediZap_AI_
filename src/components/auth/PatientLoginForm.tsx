import React, { useState } from 'react';
import { Eye, EyeOff, Mail, Lock, AlertCircle, User, Phone } from 'lucide-react';
import { useAuth } from './AuthProvider';

interface PatientLoginFormProps {
  onSwitchToGuestAccess: () => void;
  onSwitchToPatientSignup: () => void;
  onSwitchToClinicLogin: () => void;
}

export function PatientLoginForm({ 
  onSwitchToGuestAccess, 
  onSwitchToPatientSignup, 
  onSwitchToClinicLogin 
}: PatientLoginFormProps) {
  const { signIn } = useAuth();
  const [formData, setFormData] = useState({
    identifier: '',
    password: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Check if the identifier is a phone number
      const isPhoneNumber = /^[\+]?[1-9][\d]{0,15}$/.test(formData.identifier.replace(/\s/g, ''));
      
      // If it's a phone number, convert to the email format used internally
      const loginEmail = isPhoneNumber 
        ? `${formData.identifier.replace(/\s/g, '')}@medizap.local` 
        : formData.identifier;
      
      const { error } = await signIn(loginEmail, formData.password);
      if (error) throw error;
    } catch (err: any) {
      // Provide more helpful error messages
      let errorMessage = err.message || 'Failed to sign in';
      
      if (err.message?.includes('Invalid login credentials') || err.message?.includes('invalid_credentials')) {
        errorMessage = 'The email or password you entered is incorrect. Please check your credentials and try again.';
      } else if (err.message?.includes('Email not confirmed')) {
        errorMessage = 'Please check your email and click the confirmation link before signing in.';
      } else if (err.message?.includes('Too many requests')) {
        errorMessage = 'Too many login attempts. Please wait a few minutes before trying again.';
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
    // Clear error when user starts typing
    if (error) {
      setError(null);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="text-center mb-8 bg-white bg-opacity-90 p-6 rounded-xl shadow-lg">
        <div className="flex items-center justify-center space-x-3 mb-4">
          <img 
            src="/logo_symbol.png" 
            alt="MediZap AI" 
            className="h-12 w-12 object-contain"
          />
          <h1 className="text-3xl font-bold text-slate-800">MediZap AI</h1>
        </div>
        <h2 className="text-xl font-semibold text-slate-800 mb-2">Patient Login</h2>
        <p className="text-slate-600">Sign in to your patient account</p>
      </div>

      <div className="bg-white bg-opacity-95 rounded-xl shadow-lg p-8 border border-slate-200">
        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-start space-x-3">
                <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-1" />
                <div className="flex-1">
                  <p className="text-sm text-red-700 mb-2">{error}</p>
                  {error.includes('email or password you entered is incorrect') && (
                    <div className="text-xs text-red-600 space-y-1">
                      <p>• Make sure your phone number or email is entered correctly</p>
                      <p>• Check that Caps Lock is not enabled</p>
                      <p>• Try creating a new account if you don't have one</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          <div>
            <label htmlFor="identifier" className="block text-sm font-medium text-slate-700 mb-2">
              Phone Number or Email
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Mail className="h-5 w-5 text-slate-400" />
              </div>
              <input
                id="identifier"
                name="identifier"
                type="text"
                required
                value={formData.identifier}
                onChange={handleChange}
                className="block w-full pl-10 pr-3 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors bg-white"
                placeholder="Enter your phone number or email"
              />
            </div>
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-slate-700 mb-2">
              Password
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Lock className="h-5 w-5 text-slate-400" />
              </div>
              <input
                id="password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                required
                value={formData.password}
                onChange={handleChange}
                className="block w-full pl-10 pr-10 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors bg-white"
                placeholder="Enter your password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center"
              >
                {showPassword ? (
                  <EyeOff className="h-5 w-5 text-slate-400 hover:text-slate-600" />
                ) : (
                  <Eye className="h-5 w-5 text-slate-400 hover:text-slate-600" />
                )}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center px-4 py-3 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-gradient-to-r from-emerald-600 to-sky-600 hover:from-emerald-700 hover:to-sky-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
          >
            {loading ? (
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
            ) : (
              'Sign In as Patient'
            )}
          </button>
        </form>

        <div className="mt-6 space-y-4">
          <div className="text-center">
            <button
              type="button"
              onClick={onSwitchToGuestAccess}
              className="text-sm text-emerald-600 hover:text-emerald-700 transition-colors"
            >
              Continue as Guest (No Account Required)
            </button>
          </div>
          
          <div className="border-t border-slate-200 pt-4">
            <div className="text-sm text-slate-600 space-y-3">
              <div className="bg-gradient-to-r from-emerald-50 to-sky-50 rounded-lg p-4 border border-emerald-200">
                <h4 className="font-medium text-slate-800 mb-3">New to MediZap AI?</h4>
                <div className="space-y-2">
                  <button
                    type="button"
                    onClick={onSwitchToPatientSignup}
                    className="w-full inline-flex items-center justify-center px-4 py-2 bg-gradient-to-r from-emerald-600 to-sky-600 text-white rounded-lg hover:from-emerald-700 hover:to-sky-700 transition-all duration-200 text-sm font-medium"
                  >
                    <User className="h-4 w-4 mr-2" />
                    Create Patient Account
                  </button>
                  <button
                    type="button"
                    onClick={onSwitchToClinicLogin}
                    className="w-full inline-flex items-center justify-center px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors text-sm font-medium"
                  >
                    Are you a clinic admin? Sign in here
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}