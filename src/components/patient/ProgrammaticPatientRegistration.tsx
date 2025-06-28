import React, { useState, useEffect, useRef, useImperativeHandle, forwardRef } from 'react';
import { User, Phone, Calendar, AlertCircle, CheckCircle, Save } from 'lucide-react';
import { useAuth } from '../auth/AuthProvider';

// Types for external integration
export interface PatientRegistrationData {
  fullName: string;
  phone: string;
  dateOfBirth: string;
  password: string;
  confirmPassword: string;
}

export interface PatientRegistrationAPI {
  setFullName: (name: string) => void;
  setPhone: (phone: string) => void;
  setDateOfBirth: (date: string) => void;
  setPassword: (password: string) => void;
  setConfirmPassword: (password: string) => void;
  submitForm: () => Promise<{ success: boolean; data?: any; error?: string }>;
  getFormData: () => PatientRegistrationData;
  validateForm: () => { isValid: boolean; errors: string[] };
  resetForm: () => void;
  isFormValid: () => boolean;
}

export interface NavigationOptions {
  type: 'appointments' | 'walk-ins' | 'faq' | 'custom';
  clinicId?: string;
  clinicName?: string;
  customPath?: string;
  agentId?: string;
}

interface ProgrammaticPatientRegistrationProps {
  onRegistrationSuccess?: (userData: any, navigationOptions?: NavigationOptions) => void;
  onRegistrationError?: (error: string) => void;
  onNavigationRequest?: (options: NavigationOptions) => void;
  autoGeneratePassword?: boolean;
  defaultNavigationType?: NavigationOptions['type'];
  className?: string;
  showUI?: boolean; // Whether to show the visual form or run headless
}

// Global registry for external access
declare global {
  interface Window {
    MediZapPatientRegistration?: PatientRegistrationAPI;
  }
}

export const ProgrammaticPatientRegistration = forwardRef<
  PatientRegistrationAPI,
  ProgrammaticPatientRegistrationProps
>(({
  onRegistrationSuccess,
  onRegistrationError,
  onNavigationRequest,
  autoGeneratePassword = true,
  defaultNavigationType = 'appointments',
  className = '',
  showUI = true
}, ref) => {
  const { signUp } = useAuth();
  const [formData, setFormData] = useState<PatientRegistrationData>({
    fullName: '',
    phone: '',
    dateOfBirth: '',
    password: '',
    confirmPassword: ''
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  // Generate a secure password automatically
  const generatePassword = (): string => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
    let password = '';
    for (let i = 0; i < 12; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
  };

  // Auto-generate password if enabled
  useEffect(() => {
    if (autoGeneratePassword && !formData.password) {
      const newPassword = generatePassword();
      setFormData(prev => ({
        ...prev,
        password: newPassword,
        confirmPassword: newPassword
      }));
    }
  }, [autoGeneratePassword]);

  // Validation function
  const validateForm = (): { isValid: boolean; errors: string[] } => {
    const errors: string[] = [];

    if (!formData.fullName.trim()) {
      errors.push('Full name is required');
    }

    if (!formData.phone.trim()) {
      errors.push('Phone number is required');
    } else {
      const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
      if (!phoneRegex.test(formData.phone.replace(/\s/g, ''))) {
        errors.push('Please enter a valid phone number');
      }
    }

    if (!formData.dateOfBirth) {
      errors.push('Date of birth is required');
    } else {
      const birthDate = new Date(formData.dateOfBirth);
      const today = new Date();
      const age = today.getFullYear() - birthDate.getFullYear();
      if (age < 13 || age > 120) {
        errors.push('Please enter a valid date of birth (age must be between 13-120)');
      }
    }

    if (!formData.password || formData.password.length < 6) {
      errors.push('Password must be at least 6 characters long');
    }

    if (formData.password !== formData.confirmPassword) {
      errors.push('Passwords do not match');
    }

    setValidationErrors(errors);
    return { isValid: errors.length === 0, errors };
  };

  // API functions for external control
  const api: PatientRegistrationAPI = {
    setFullName: (name: string) => {
      setFormData(prev => ({ ...prev, fullName: name }));
      setError(null);
    },

    setPhone: (phone: string) => {
      setFormData(prev => ({ ...prev, phone: phone }));
      setError(null);
    },

    setDateOfBirth: (date: string) => {
      setFormData(prev => ({ ...prev, dateOfBirth: date }));
      setError(null);
    },

    setPassword: (password: string) => {
      setFormData(prev => ({ ...prev, password: password }));
      setError(null);
    },

    setConfirmPassword: (password: string) => {
      setFormData(prev => ({ ...prev, confirmPassword: password }));
      setError(null);
    },

    getFormData: () => ({ ...formData }),

    validateForm: () => validateForm(),

    isFormValid: () => validateForm().isValid,

    resetForm: () => {
      setFormData({
        fullName: '',
        phone: '',
        dateOfBirth: '',
        password: autoGeneratePassword ? generatePassword() : '',
        confirmPassword: autoGeneratePassword ? formData.password : ''
      });
      setError(null);
      setSuccess(false);
      setValidationErrors([]);
    },

    submitForm: async (): Promise<{ success: boolean; data?: any; error?: string }> => {
      const validation = validateForm();
      if (!validation.isValid) {
        const errorMessage = `Validation failed: ${validation.errors.join(', ')}`;
        setError(errorMessage);
        onRegistrationError?.(errorMessage);
        return { success: false, error: errorMessage };
      }

      setLoading(true);
      setError(null);

      try {
        // Split full name into first and last name
        const nameParts = formData.fullName.trim().split(' ');
        const firstName = nameParts[0] || '';
        const lastName = nameParts.slice(1).join(' ') || '';

        // Create user account with patient metadata
        const { data: authData, error: authError } = await signUp(
          `${formData.phone}@medizap.local`, // Use phone as email for authentication
          formData.password,
          {
            first_name: firstName,
            last_name: lastName,
            full_name: formData.fullName,
            phone: formData.phone,
            date_of_birth: formData.dateOfBirth,
            user_type: 'patient'
          }
        );

        if (authError) throw authError;

        if (authData.user) {
          const userData = {
            id: authData.user.id,
            email: `${formData.phone}@medizap.local`,
            name: formData.fullName,
            phone: formData.phone,
            dateOfBirth: formData.dateOfBirth
          };

          setSuccess(true);
          onRegistrationSuccess?.(userData, { type: defaultNavigationType });
          
          return { success: true, data: userData };
        }

        throw new Error('User creation failed');
      } catch (err: any) {
        const errorMessage = err.message || 'Failed to create account';
        setError(errorMessage);
        onRegistrationError?.(errorMessage);
        return { success: false, error: errorMessage };
      } finally {
        setLoading(false);
      }
    }
  };

  // Expose API to ref and global window
  useImperativeHandle(ref, () => api);

  useEffect(() => {
    window.MediZapPatientRegistration = api;
    return () => {
      delete window.MediZapPatientRegistration;
    };
  }, []);

  // Navigation helper functions for AI agents
  const navigateToAppointments = (clinicId?: string, clinicName?: string) => {
    onNavigationRequest?.({ type: 'appointments', clinicId, clinicName });
  };

  const navigateToWalkIns = (clinicId?: string, clinicName?: string) => {
    onNavigationRequest?.({ type: 'walk-ins', clinicId, clinicName });
  };

  const navigateToFAQ = (agentId?: string) => {
    onNavigationRequest?.({ type: 'faq', agentId });
  };

  // Expose navigation functions globally for AI agents
  useEffect(() => {
    window.MediZapNavigation = {
      toAppointments: navigateToAppointments,
      toWalkIns: navigateToWalkIns,
      toFAQ: navigateToFAQ,
      custom: (path: string) => onNavigationRequest?.({ type: 'custom', customPath: path })
    };

    return () => {
      delete window.MediZapNavigation;
    };
  }, [onNavigationRequest]);

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await api.submitForm();
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setError(null);
  };

  // Success state
  if (success && showUI) {
    return (
      <div className={`max-w-md mx-auto text-center ${className}`}>
        <div className="bg-white rounded-xl shadow-lg p-8 border border-emerald-200">
          <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="h-8 w-8 text-emerald-600" />
          </div>
          <h2 className="text-2xl font-bold text-slate-800 mb-2">Registration Successful!</h2>
          <p className="text-slate-600 mb-4">
            Welcome to MediZap AI, {formData.fullName}! Your patient account has been created.
          </p>
          <div className="bg-slate-50 rounded-lg p-4 mb-6">
            <p className="text-sm text-slate-600">
              <span className="font-medium">Phone:</span> {formData.phone}
            </p>
            <p className="text-sm text-slate-600">
              <span className="font-medium">Name:</span> {formData.fullName}
            </p>
          </div>
          <p className="text-sm text-slate-500">
            You can now proceed to book appointments or register for walk-ins.
          </p>
        </div>
      </div>
    );
  }

  // Don't render UI if showUI is false (headless mode)
  if (!showUI) {
    return null;
  }

  return (
    <div className={`max-w-2xl mx-auto ${className}`}>
      <div className="text-center mb-8">
        <div className="flex items-center justify-center space-x-3 mb-4">
          <img 
            src="/logo_symbol.png" 
            alt="MediZap AI" 
            className="h-12 w-12 object-contain"
          />
          <h1 className="text-3xl font-bold text-slate-800">Patient Registration</h1>
        </div>
        <p className="text-slate-600">Create your account for AI-powered healthcare booking</p>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-lg p-8 border border-slate-200">
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start space-x-3 mb-6">
            <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {validationErrors.length > 0 && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
            <h4 className="text-sm font-medium text-yellow-800 mb-2">Please fix the following issues:</h4>
            <ul className="text-sm text-yellow-700 space-y-1">
              {validationErrors.map((error, index) => (
                <li key={index}>• {error}</li>
              ))}
            </ul>
          </div>
        )}

        <div className="space-y-6">
          <div>
            <label htmlFor="fullName" className="block text-sm font-medium text-slate-700 mb-2">
              Full Name *
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <User className="h-5 w-5 text-slate-400" />
              </div>
              <input
                id="fullName"
                name="fullName"
                type="text"
                required
                value={formData.fullName}
                onChange={handleChange}
                className="block w-full pl-10 pr-3 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors bg-white"
                placeholder="Enter your full name"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-slate-700 mb-2">
                Phone Number *
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Phone className="h-5 w-5 text-slate-400" />
                </div>
                <input
                  id="phone"
                  name="phone"
                  type="tel"
                  required
                  value={formData.phone}
                  onChange={handleChange}
                  className="block w-full pl-10 pr-3 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors bg-white"
                  placeholder="+1 (555) 123-4567"
                />
              </div>
            </div>

            <div>
              <label htmlFor="dateOfBirth" className="block text-sm font-medium text-slate-700 mb-2">
                Date of Birth *
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Calendar className="h-5 w-5 text-slate-400" />
                </div>
                <input
                  id="dateOfBirth"
                  name="dateOfBirth"
                  type="date"
                  required
                  value={formData.dateOfBirth}
                  onChange={handleChange}
                  max={new Date().toISOString().split('T')[0]}
                  className="block w-full pl-10 pr-3 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors bg-white"
                />
              </div>
            </div>
          </div>

          {!autoGeneratePassword && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-slate-700 mb-2">
                  Password *
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  value={formData.password}
                  onChange={handleChange}
                  className="block w-full px-3 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors bg-white"
                  placeholder="Create password"
                />
              </div>

              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-slate-700 mb-2">
                  Confirm Password *
                </label>
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  required
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  className="block w-full px-3 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors bg-white"
                  placeholder="Confirm password"
                />
              </div>
            </div>
          )}

          {autoGeneratePassword && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-700">
                <span className="font-medium">Auto-Generated Password:</span> A secure password has been automatically created for your account.
              </p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full px-4 py-3 bg-gradient-to-r from-emerald-600 to-sky-600 text-white rounded-lg hover:from-emerald-700 hover:to-sky-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
          >
            {loading ? (
              <div className="flex items-center justify-center">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                Creating Account...
              </div>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2 inline" />
                Create Patient Account
              </>
            )}
          </button>
        </div>
      </form>

      {/* Integration Guide for Developers */}
      <div className="mt-8 bg-slate-50 rounded-lg p-6 border border-slate-200">
        <h3 className="text-lg font-medium text-slate-800 mb-4">AI Integration Guide</h3>
        <div className="space-y-3 text-sm text-slate-600">
          <p><strong>Global API Access:</strong> <code>window.MediZapPatientRegistration</code></p>
          <p><strong>Navigation API:</strong> <code>window.MediZapNavigation</code></p>
          <div className="bg-white rounded p-3 font-mono text-xs">
            <p>// Example usage from ElevenLabs agent:</p>
            <p>window.MediZapPatientRegistration.setFullName("John Doe");</p>
            <p>window.MediZapPatientRegistration.setPhone("+1234567890");</p>
            <p>window.MediZapPatientRegistration.setDateOfBirth("1990-01-01");</p>
            <p>await window.MediZapPatientRegistration.submitForm();</p>
          </div>
        </div>
      </div>
    </div>
  );
});

ProgrammaticPatientRegistration.displayName = 'ProgrammaticPatientRegistration';

export default ProgrammaticPatientRegistration;