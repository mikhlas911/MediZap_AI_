import React, { useState, useEffect, useRef } from 'react';
import { User, Phone, Calendar, AlertCircle, CheckCircle, Mic, MessageSquare, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../auth/AuthProvider';
import { useParams } from 'react-router-dom';

interface PatientRegistrationData {
  fullName: string;
  phone: string;
  dateOfBirth: string;
  password: string;
  confirmPassword: string;
}

interface AIPatientRegistrationWithWidgetProps {
  clinicId?: string;
  clinicName?: string;
  onRegistrationSuccess?: (userData: any) => void;
  onRegistrationError?: (error: string) => void;
}

export function AIPatientRegistrationWithWidget({
  clinicId,
  clinicName,
  onRegistrationSuccess,
  onRegistrationError
}: AIPatientRegistrationWithWidgetProps) {
  const { signUp } = useAuth();
  const widgetContainerRef = useRef<HTMLDivElement>(null);
  const scriptLoadedRef = useRef(false);
  
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
  const [showReview, setShowReview] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [widgetLoading, setWidgetLoading] = useState(true);
  const [widgetError, setWidgetError] = useState<string | null>(null);

  // Generate a secure password automatically
  const generatePassword = (): string => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
    let password = '';
    for (let i = 0; i < 12; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
  };

  // Auto-generate password on component mount
  useEffect(() => {
    const newPassword = generatePassword();
    setFormData(prev => ({
      ...prev,
      password: newPassword,
      confirmPassword: newPassword
    }));
  }, []);

  // Load ElevenLabs script and initialize widget
  useEffect(() => {
    loadElevenLabsScript();
  }, []);

  // Initialize widget when script is loaded
  useEffect(() => {
    if (scriptLoadedRef.current) {
      initializeWidget();
    }
  }, [scriptLoadedRef.current, clinicId, clinicName]);

  const loadElevenLabsScript = () => {
    // Check if script is already loaded
    if (document.querySelector('script[src*="convai-widget-embed"]')) {
      scriptLoadedRef.current = true;
      setWidgetLoading(false);
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://unpkg.com/@elevenlabs/convai-widget-embed';
    script.async = true;
    script.type = 'text/javascript';
    
    script.onload = () => {
      scriptLoadedRef.current = true;
      setWidgetLoading(false);
      setWidgetError(null);
    };
    
    script.onerror = () => {
      setWidgetError('Failed to load ElevenLabs voice agent. Please try again.');
      setWidgetLoading(false);
    };

    document.head.appendChild(script);
  };

  const initializeWidget = () => {
    if (!widgetContainerRef.current) return;

    try {
      // Clear any existing widget
      widgetContainerRef.current.innerHTML = '';

      // Create the ElevenLabs widget element with the new agent ID
      const widget = document.createElement('elevenlabs-convai');
      widget.setAttribute('agent-id', 'agent_01jy12vvryfnetmjmbe0vby1ec');
      
      // Pass context as dynamic variables
      const dynamicVariables = {
        clinicId: clinicId || 'general',
        clinicName: clinicName || 'MediZap AI',
        context: 'patient_registration',
        timestamp: new Date().toISOString(),
        formFields: ['fullName', 'phone', 'dateOfBirth']
      };
      
      widget.setAttribute('dynamic-variables', JSON.stringify(dynamicVariables));
      
      // Add custom styling
      widget.style.width = '100%';
      widget.style.height = '400px';
      widget.style.border = 'none';
      widget.style.borderRadius = '12px';

      // Add event listeners for widget events
      widget.addEventListener('conversation-started', () => {
        console.log('ElevenLabs conversation started for patient registration');
      });

      widget.addEventListener('conversation-ended', () => {
        console.log('ElevenLabs conversation ended');
      });

      // Append widget to container
      widgetContainerRef.current.appendChild(widget);
      setWidgetError(null);
    } catch (err) {
      console.error('Error initializing ElevenLabs widget:', err);
      setWidgetError('Failed to initialize voice agent. Please try again.');
    }
  };

  // Expose API functions for the AI agent
  useEffect(() => {
    window.MediZapPatientRegistration = {
      setFullName: (name: string) => {
        setFormData(prev => ({ ...prev, fullName: name }));
        setError(null);
        console.log('AI Agent set full name:', name);
      },

      setPhone: (phone: string) => {
        setFormData(prev => ({ ...prev, phone: phone }));
        setError(null);
        console.log('AI Agent set phone:', phone);
      },

      setDateOfBirth: (date: string) => {
        setFormData(prev => ({ ...prev, dateOfBirth: date }));
        setError(null);
        console.log('AI Agent set date of birth:', date);
      },

      getFormData: () => ({
        fullName: formData.fullName,
        phone: formData.phone,
        dateOfBirth: formData.dateOfBirth
        // Don't expose password data
      }),

      validateForm: () => {
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

        return { isValid: errors.length === 0, errors };
      },

      showReview: () => {
        const validation = window.MediZapPatientRegistration?.validateForm();
        if (validation?.isValid) {
          setShowReview(true);
          console.log('AI Agent requested review of form data');
        } else {
          console.log('AI Agent tried to show review but form is invalid:', validation?.errors);
          return { success: false, errors: validation?.errors || [] };
        }
        return { success: true };
      },

      submitForm: async () => {
        const validation = window.MediZapPatientRegistration?.validateForm();
        if (!validation?.isValid) {
          const errorMessage = `Validation failed: ${validation?.errors.join(', ')}`;
          setError(errorMessage);
          onRegistrationError?.(errorMessage);
          return { success: false, error: errorMessage };
        }

        return await handleSubmit();
      },

      resetForm: () => {
        const newPassword = generatePassword();
        setFormData({
          fullName: '',
          phone: '',
          dateOfBirth: '',
          password: newPassword,
          confirmPassword: newPassword
        });
        setError(null);
        setSuccess(false);
        setShowReview(false);
        console.log('AI Agent reset form');
      },

      isFormValid: () => {
        return window.MediZapPatientRegistration?.validateForm()?.isValid || false;
      }
    };

    return () => {
      delete window.MediZapPatientRegistration;
    };
  }, [formData]);

  const handleSubmit = async (): Promise<{ success: boolean; data?: any; error?: string }> => {
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
        onRegistrationSuccess?.(userData);
        
        console.log('Patient registration successful:', userData);
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
  };

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await handleSubmit();
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setError(null);
  };

  // Success state
  if (success) {
    return (
      <div className="max-w-md mx-auto text-center">
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

  return (
    <div className="max-w-6xl mx-auto">
      <div className="text-center mb-8">
        <div className="flex items-center justify-center space-x-3 mb-4">
          <img 
            src="/logo_symbol.png" 
            alt="MediZap AI" 
            className="h-12 w-12 object-contain"
          />
          <h1 className="text-3xl font-bold text-slate-800">AI-Powered Patient Registration</h1>
        </div>
        <p className="text-slate-600">Talk to our AI assistant to create your account quickly and easily</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* AI Voice Assistant */}
        <div className="bg-white rounded-xl shadow-lg border border-slate-200">
          <div className="p-6 border-b border-slate-200">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
                <Mic className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-800">AI Registration Assistant</h2>
                <p className="text-sm text-slate-600">Speak naturally to register your account</p>
              </div>
            </div>
          </div>

          <div className="p-6">
            {widgetLoading && (
              <div className="flex items-center justify-center py-12">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto mb-4"></div>
                  <p className="text-slate-600">Loading AI Assistant...</p>
                </div>
              </div>
            )}

            {widgetError && (
              <div className="flex items-center justify-center py-12">
                <div className="text-center">
                  <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
                  <p className="text-slate-600 mb-4">{widgetError}</p>
                  <button
                    onClick={() => {
                      setWidgetError(null);
                      setWidgetLoading(true);
                      loadElevenLabsScript();
                    }}
                    className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
                  >
                    Try Again
                  </button>
                </div>
              </div>
            )}

            {!widgetLoading && !widgetError && (
              <div className="space-y-4">
                {/* Instructions */}
                <div className="bg-gradient-to-r from-emerald-50 to-sky-50 rounded-lg p-4 border border-emerald-200">
                  <h4 className="font-medium text-slate-800 mb-2">How to use the AI Assistant:</h4>
                  <ul className="text-sm text-slate-600 space-y-1">
                    <li>• Click the microphone to start talking</li>
                    <li>• Tell the AI your full name, phone number, and date of birth</li>
                    <li>• The AI will review your information before submitting</li>
                    <li>• Speak naturally - no special commands needed</li>
                  </ul>
                </div>

                {/* ElevenLabs Widget Container */}
                <div 
                  ref={widgetContainerRef}
                  className="bg-slate-50 rounded-lg border border-slate-200 min-h-[400px] flex items-center justify-center"
                >
                  <div className="text-center text-slate-500">
                    <Mic className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>Initializing voice interface...</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Registration Form */}
        <div className="bg-white rounded-xl shadow-lg border border-slate-200">
          <div className="p-6 border-b border-slate-200">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-sky-100 rounded-lg flex items-center justify-center">
                <MessageSquare className="h-5 w-5 text-sky-600" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-800">Registration Form</h2>
                <p className="text-sm text-slate-600">Information collected by AI assistant</p>
              </div>
            </div>
          </div>

          <form onSubmit={handleManualSubmit} className="p-6">
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start space-x-3 mb-6">
                <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-700">{error}</p>
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
                    placeholder="AI will fill this automatically"
                    readOnly={!!formData.fullName}
                  />
                </div>
              </div>

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
                    placeholder="AI will fill this automatically"
                    readOnly={!!formData.phone}
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
                    readOnly={!!formData.dateOfBirth}
                  />
                </div>
              </div>

              {/* Password Section (Auto-generated) */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium text-blue-800">Auto-Generated Password</h4>
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="text-blue-600 hover:text-blue-700"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                <p className="text-sm text-blue-700 mb-2">
                  A secure password has been automatically generated for your account.
                </p>
                {showPassword && (
                  <div className="bg-white rounded p-2 font-mono text-sm">
                    {formData.password}
                  </div>
                )}
              </div>

              {/* Review Section */}
              {showReview && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <h4 className="font-medium text-green-800 mb-3">Please Review Your Information</h4>
                  <div className="space-y-2 text-sm text-green-700">
                    <p><span className="font-medium">Full Name:</span> {formData.fullName}</p>
                    <p><span className="font-medium">Phone:</span> {formData.phone}</p>
                    <p><span className="font-medium">Date of Birth:</span> {formData.dateOfBirth}</p>
                  </div>
                  <div className="mt-4 flex space-x-3">
                    <button
                      type="submit"
                      disabled={loading}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
                    >
                      {loading ? 'Creating Account...' : 'Confirm & Create Account'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowReview(false)}
                      className="px-4 py-2 border border-green-300 text-green-700 rounded-lg hover:bg-green-100 transition-colors"
                    >
                      Edit Information
                    </button>
                  </div>
                </div>
              )}

              {/* Manual Submit (if not using AI) */}
              {!showReview && (
                <button
                  type="submit"
                  disabled={loading || !formData.fullName || !formData.phone || !formData.dateOfBirth}
                  className="w-full px-4 py-3 bg-gradient-to-r from-sky-600 to-emerald-600 text-white rounded-lg hover:from-sky-700 hover:to-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                >
                  {loading ? (
                    <div className="flex items-center justify-center">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                      Creating Account...
                    </div>
                  ) : (
                    'Create Patient Account'
                  )}
                </button>
              )}
            </div>
          </form>
        </div>
      </div>

      {/* Integration Guide */}
      <div className="mt-8 bg-slate-50 rounded-lg p-6 border border-slate-200">
        <h3 className="text-lg font-medium text-slate-800 mb-4">AI Assistant Features</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div className="bg-white rounded-lg p-4 border border-slate-200">
            <h4 className="font-medium text-slate-800 mb-2">Natural Conversation</h4>
            <p className="text-slate-600">Speak naturally with our AI assistant. No need for specific commands or keywords.</p>
          </div>
          <div className="bg-white rounded-lg p-4 border border-slate-200">
            <h4 className="font-medium text-slate-800 mb-2">Information Review</h4>
            <p className="text-slate-600">The AI will review all collected information with you before submitting the form.</p>
          </div>
          <div className="bg-white rounded-lg p-4 border border-slate-200">
            <h4 className="font-medium text-slate-800 mb-2">Secure Registration</h4>
            <p className="text-slate-600">Your information is securely processed and a strong password is automatically generated.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AIPatientRegistrationWithWidget;