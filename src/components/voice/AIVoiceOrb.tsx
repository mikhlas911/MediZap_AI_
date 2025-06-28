import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Volume2, VolumeX, X } from 'lucide-react';

interface AIVoiceOrbProps {
  isOpen: boolean;
  onClose: () => void;
  clinicId: string;
  clinicName?: string;
  onAppointmentBooked?: (appointment: any) => void;
  onWalkinRegistered?: (walkin: any) => void;
}

export function AIVoiceOrb({
  isOpen,
  onClose,
  clinicId,
  clinicName,
  onAppointmentBooked,
  onWalkinRegistered
}: AIVoiceOrbProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const widgetContainerRef = useRef<HTMLDivElement>(null);
  const scriptLoadedRef = useRef(false);

  // Load ElevenLabs script when component mounts
  useEffect(() => {
    if (isOpen && !scriptLoadedRef.current) {
      loadElevenLabsScript();
    }
  }, [isOpen]);

  // Initialize widget when modal opens
  useEffect(() => {
    if (isOpen && scriptLoadedRef.current) {
      initializeWidget();
    }
  }, [isOpen, scriptLoadedRef.current, clinicId, clinicName]);

  // Cleanup when modal closes
  useEffect(() => {
    if (!isOpen) {
      cleanup();
    }
  }, [isOpen]);

  const loadElevenLabsScript = () => {
    // Check if script is already loaded
    if (document.querySelector('script[src*="convai-widget-embed"]')) {
      scriptLoadedRef.current = true;
      setIsLoading(false);
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://unpkg.com/@elevenlabs/convai-widget-embed';
    script.async = true;
    script.type = 'text/javascript';
    
    script.onload = () => {
      scriptLoadedRef.current = true;
      setIsLoading(false);
      setError(null);
    };
    
    script.onerror = () => {
      setError('Failed to load ElevenLabs voice agent. Please try again.');
      setIsLoading(false);
    };

    document.head.appendChild(script);
  };

  const initializeWidget = () => {
    if (!widgetContainerRef.current) return;

    try {
      console.log('[DEBUG] AIVoiceOrb - Initializing widget with:', {
        clinicId,
        clinicName,
        timestamp: new Date().toISOString()
      });

      // Clear any existing widget
      widgetContainerRef.current.innerHTML = '';

      // Create the ElevenLabs widget element
      const widget = document.createElement('elevenlabs-convai');
      widget.setAttribute('agent-id', 'agent_01jy12vvryfnetmjmbe0vby1ec');
      
      // Pass clinic context as dynamic variables with ALL required fields
      const dynamicVariables = {
        // Core clinic context
        clinicId: clinicId || 'default-clinic',
        clinicName: clinicName || 'Default Clinic',
        context: 'patient_booking',
        timestamp: new Date().toISOString(),
        
        // Required tool parameters for get-doctors function
        departmentId: null,
        offset: 0,
        limit: 50,
        includeAvailability: true,
        isActive: true,
        
        // Additional context for the AI agent
        sessionId: `session_${Date.now()}`,
        userType: 'guest',
        conversationStep: 'greeting',
        
        // API endpoints (if needed by the agent)
        apiBaseUrl: window.location.origin,
        
        // Feature flags
        enableAppointmentBooking: true,
        enableWalkInRegistration: true,
        enableDoctorSelection: true,
        enableDepartmentSelection: true,
        
        // Default values for form fields
        patientName: null,
        patientPhone: null,
        patientEmail: null,
        appointmentDate: null,
        appointmentTime: null,
        selectedDoctorId: null,
        selectedDepartmentId: null,
        
        // Pagination and filtering defaults
        page: 1,
        pageSize: 50,
        sortBy: 'name',
        sortOrder: 'asc',
        filterActive: true,
        
        // Language and locale
        language: 'en',
        locale: 'en-US',
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
      };
      
      console.log('[DEBUG] AIVoiceOrb - Setting dynamic variables:', dynamicVariables);
      
      widget.setAttribute('dynamic-variables', JSON.stringify(dynamicVariables));
      
      // Add custom styling to make it fit our modal
      widget.style.width = '100%';
      widget.style.height = '400px';
      widget.style.border = 'none';
      widget.style.borderRadius = '12px';

      // Add event listeners for widget events if available
      widget.addEventListener('conversation-started', () => {
        console.log('[DEBUG] ElevenLabs conversation started for clinic:', clinicName);
      });

      widget.addEventListener('conversation-ended', () => {
        console.log('[DEBUG] ElevenLabs conversation ended for clinic:', clinicName);
      });

      // Listen for appointment booking events
      widget.addEventListener('appointment-booked', (event: any) => {
        console.log('[DEBUG] Appointment booked via AI:', event.detail);
        if (onAppointmentBooked) {
          onAppointmentBooked(event.detail);
        }
      });

      // Listen for walk-in registration events
      widget.addEventListener('walkin-registered', (event: any) => {
        console.log('[DEBUG] Walk-in registered via AI:', event.detail);
        if (onWalkinRegistered) {
          onWalkinRegistered(event.detail);
        }
      });

      // Listen for errors
      widget.addEventListener('error', (event: any) => {
        console.error('[ERROR] ElevenLabs widget error:', event.detail);
        setError(`AI Agent Error: ${event.detail?.message || 'Unknown error'}`);
      });

      // Listen for connection status
      widget.addEventListener('connected', () => {
        console.log('[DEBUG] ElevenLabs widget connected successfully');
        setError(null);
      });

      widget.addEventListener('disconnected', (event: any) => {
        console.warn('[WARN] ElevenLabs widget disconnected:', event.detail);
        if (event.detail?.reason?.includes('Missing required dynamic variables')) {
          setError('Configuration error: Missing required variables. Please refresh and try again.');
        }
      });

      // Append widget to container
      widgetContainerRef.current.appendChild(widget);
      setError(null);
      
      console.log('[DEBUG] ElevenLabs widget initialized successfully with all dynamic variables');
    } catch (err) {
      console.error('[ERROR] Error initializing ElevenLabs widget:', err);
      setError('Failed to initialize voice agent. Please try again.');
    }
  };

  const cleanup = () => {
    if (widgetContainerRef.current) {
      widgetContainerRef.current.innerHTML = '';
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-slate-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <img 
                src="/logo_symbol.png" 
                alt="MediZap AI" 
                className="h-8 w-8 object-contain"
              />
              <div>
                <h2 className="text-lg font-bold text-slate-800">MediZap AI Voice Assistant</h2>
                {clinicName && (
                  <p className="text-sm text-slate-600">{clinicName}</p>
                )}
                {clinicId && (
                  <p className="text-xs text-slate-500">Clinic ID: {clinicId}</p>
                )}
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <X className="h-5 w-5 text-slate-500" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {isLoading && (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto mb-4"></div>
                <p className="text-slate-600">Loading AI Voice Assistant...</p>
                <p className="text-sm text-slate-500 mt-2">Initializing ElevenLabs Conversational AI</p>
              </div>
            </div>
          )}

          {error && (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <X className="h-8 w-8 text-red-600" />
                </div>
                <h3 className="text-lg font-medium text-slate-800 mb-2">Voice Assistant Error</h3>
                <p className="text-slate-600 mb-4">{error}</p>
                <div className="space-y-2">
                  <button
                    onClick={() => {
                      setError(null);
                      setIsLoading(true);
                      loadElevenLabsScript();
                    }}
                    className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors mr-2"
                  >
                    Try Again
                  </button>
                  <button
                    onClick={onClose}
                    className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          )}

          {!isLoading && !error && (
            <div className="space-y-4">
              {/* Instructions */}
              <div className="bg-gradient-to-r from-emerald-50 to-sky-50 rounded-lg p-4 border border-emerald-200">
                <div className="flex items-start space-x-3">
                  <div className="w-8 h-8 bg-emerald-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <Mic className="h-4 w-4 text-emerald-600" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-medium text-slate-800 mb-1">AI Voice Assistant Ready</h4>
                    <p className="text-sm text-slate-600 mb-2">
                      Our advanced AI can help you with:
                    </p>
                    <ul className="text-sm text-slate-600 space-y-1">
                      <li>• Booking appointments with available doctors</li>
                      <li>• Registering as a walk-in patient</li>
                      <li>• Answering questions about clinic services</li>
                      <li>• Providing clinic information and hours</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Debug Info (only in development) */}
              {process.env.NODE_ENV === 'development' && (
                <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                  <h4 className="font-medium text-blue-800 mb-2">Debug Information</h4>
                  <div className="text-sm text-blue-700 space-y-1">
                    <p><strong>Clinic ID:</strong> {clinicId || 'Not provided'}</p>
                    <p><strong>Clinic Name:</strong> {clinicName || 'Not provided'}</p>
                    <p><strong>Script Loaded:</strong> {scriptLoadedRef.current ? 'Yes' : 'No'}</p>
                    <p><strong>Widget Container:</strong> {widgetContainerRef.current ? 'Ready' : 'Not ready'}</p>
                  </div>
                </div>
              )}

              {/* ElevenLabs Widget Container */}
              <div 
                ref={widgetContainerRef}
                className="bg-slate-50 rounded-lg border border-slate-200 min-h-[400px] flex items-center justify-center"
              >
                {/* Widget will be inserted here */}
                <div className="text-center text-slate-500">
                  <Mic className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>Initializing voice interface...</p>
                </div>
              </div>

              {/* Features */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div className="bg-white rounded-lg p-4 border border-slate-200">
                  <h5 className="font-medium text-slate-800 mb-2">Natural Conversation</h5>
                  <p className="text-slate-600">Speak naturally with our AI assistant. No need for specific commands or keywords.</p>
                </div>
                <div className="bg-white rounded-lg p-4 border border-slate-200">
                  <h5 className="font-medium text-slate-800 mb-2">Multi-Language Support</h5>
                  <p className="text-slate-600">Communicate in English, Hindi, or Malayalam for your convenience.</p>
                </div>
                <div className="bg-white rounded-lg p-4 border border-slate-200">
                  <h5 className="font-medium text-slate-800 mb-2">Instant Booking</h5>
                  <p className="text-slate-600">Book appointments instantly with real-time availability checking.</p>
                </div>
                <div className="bg-white rounded-lg p-4 border border-slate-200">
                  <h5 className="font-medium text-slate-800 mb-2">Smart Assistance</h5>
                  <p className="text-slate-600">Get help with scheduling, rescheduling, and clinic information.</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center space-x-2 text-slate-600">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
              <span>Powered by ElevenLabs Conversational AI</span>
            </div>
            <button
              onClick={onClose}
              className="text-slate-600 hover:text-slate-800 transition-colors"
            >
              Close Assistant
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}