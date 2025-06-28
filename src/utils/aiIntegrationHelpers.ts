// Helper functions and types for AI agent integration

export interface AIAgentCommands {
  // Patient Registration Commands
  setPatientName: (name: string) => void;
  setPatientPhone: (phone: string) => void;
  setPatientDateOfBirth: (date: string) => void;
  submitPatientRegistration: () => Promise<{ success: boolean; data?: any; error?: string }>;
  
  // Navigation Commands
  navigateToAppointments: (clinicId?: string, clinicName?: string) => void;
  navigateToWalkIns: (clinicId?: string, clinicName?: string) => void;
  navigateToFAQ: (agentId?: string) => void;
  
  // Validation Commands
  validatePatientForm: () => { isValid: boolean; errors: string[] };
  isPatientFormReady: () => boolean;
  
  // Data Retrieval Commands
  getPatientFormData: () => any;
  getRegistrationStatus: () => 'idle' | 'loading' | 'success' | 'error';
}

export interface AIIntegrationConfig {
  autoGeneratePassword: boolean;
  defaultNavigationType: 'appointments' | 'walk-ins' | 'faq';
  enableVoiceCommands: boolean;
  clinicId?: string;
  clinicName?: string;
  agentId?: string;
}

// Global AI command interface
declare global {
  interface Window {
    MediZapPatientRegistration?: {
      setFullName: (name: string) => void;
      setPhone: (phone: string) => void;
      setDateOfBirth: (date: string) => void;
      getFormData: () => any;
      validateForm: () => { isValid: boolean; errors: string[] };
      showReview: () => { success: boolean; errors?: string[] };
      submitForm: () => Promise<{ success: boolean; data?: any; error?: string }>;
      resetForm: () => void;
      isFormValid: () => boolean;
    };
    
    MediZapAI?: {
      // Patient Registration API
      PatientRegistration?: {
        setFullName: (name: string) => void;
        setPhone: (phone: string) => void;
        setDateOfBirth: (date: string) => void;
        setPassword: (password: string) => void;
        setConfirmPassword: (password: string) => void;
        submitForm: () => Promise<{ success: boolean; data?: any; error?: string }>;
        getFormData: () => any;
        validateForm: () => { isValid: boolean; errors: string[] };
        resetForm: () => void;
        isFormValid: () => boolean;
      };
      
      // Navigation API
      Navigation?: {
        toAppointments: (clinicId?: string, clinicName?: string) => void;
        toWalkIns: (clinicId?: string, clinicName?: string) => void;
        toFAQ: (agentId?: string) => void;
        custom: (path: string) => void;
      };
      
      // Status API
      Status?: {
        getCurrentStep: () => string;
        isRegistrationComplete: () => boolean;
        getLastError: () => string | null;
        getUserData: () => any;
      };
    };
    
    MediZapNavigation?: {
      toAppointments: (clinicId?: string, clinicName?: string) => void;
      toWalkIns: (clinicId?: string, clinicName?: string) => void;
      toFAQ: (agentId?: string) => void;
      custom: (path: string) => void;
    };
  }
}

// Helper function to initialize AI integration
export const initializeAIIntegration = (config: AIIntegrationConfig) => {
  console.log('Initializing MediZap AI Integration with config:', config);
  
  // Set up global configuration
  window.MediZapAIConfig = config;
  
  // Initialize status tracking
  window.MediZapAI = {
    ...window.MediZapAI,
    Status: {
      getCurrentStep: () => {
        return document.querySelector('[data-medizap-step]')?.getAttribute('data-medizap-step') || 'unknown';
      },
      isRegistrationComplete: () => {
        return !!window.MediZapAI?.Status?.getUserData();
      },
      getLastError: () => {
        return window.MediZapLastError || null;
      },
      getUserData: () => {
        return window.MediZapUserData || null;
      }
    }
  };
};

// Helper function for ElevenLabs integration
export const setupElevenLabsIntegration = (agentId: string) => {
  // Create the ElevenLabs widget element
  const widget = document.createElement('elevenlabs-convai');
  widget.setAttribute('agent-id', agentId);
  
  // Add event listeners for widget events
  widget.addEventListener('conversation-started', () => {
    console.log('ElevenLabs conversation started');
  });

  widget.addEventListener('conversation-ended', () => {
    console.log('ElevenLabs conversation ended');
  });

  // Listen for custom events from the AI agent
  widget.addEventListener('patient-registration-request', (event: any) => {
    const { name, phone, dateOfBirth } = event.detail;
    
    if (window.MediZapPatientRegistration) {
      if (name) window.MediZapPatientRegistration.setFullName(name);
      if (phone) window.MediZapPatientRegistration.setPhone(phone);
      if (dateOfBirth) window.MediZapPatientRegistration.setDateOfBirth(dateOfBirth);
    }
  });

  widget.addEventListener('submit-registration', async () => {
    if (window.MediZapPatientRegistration) {
      const result = await window.MediZapPatientRegistration.submitForm();
      
      // Send result back to AI agent
      widget.dispatchEvent(new CustomEvent('registration-result', {
        detail: result
      }));
    }
  });

  widget.addEventListener('navigation-request', (event: any) => {
    const { type, clinicId, clinicName, agentId } = event.detail;
    
    if (window.MediZapNavigation) {
      switch (type) {
        case 'appointments':
          window.MediZapNavigation.toAppointments(clinicId, clinicName);
          break;
        case 'walk-ins':
          window.MediZapNavigation.toWalkIns(clinicId, clinicName);
          break;
        case 'faq':
          window.MediZapNavigation.toFAQ(agentId);
          break;
      }
    }
  });

  return widget;
};

// Validation helpers for AI agents
export const validatePatientData = (data: any): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];

  if (!data.fullName || data.fullName.trim().length < 2) {
    errors.push('Full name must be at least 2 characters long');
  }

  if (!data.phone || !/^[\+]?[1-9][\d]{0,15}$/.test(data.phone.replace(/\s/g, ''))) {
    errors.push('Please provide a valid phone number');
  }

  if (!data.dateOfBirth) {
    errors.push('Date of birth is required');
  } else {
    const birthDate = new Date(data.dateOfBirth);
    const today = new Date();
    const age = today.getFullYear() - birthDate.getFullYear();
    if (age < 13 || age > 120) {
      errors.push('Age must be between 13 and 120 years');
    }
  }

  return { isValid: errors.length === 0, errors };
};

// Date formatting helpers for AI agents
export const formatDateForInput = (dateString: string): string => {
  try {
    const date = new Date(dateString);
    return date.toISOString().split('T')[0];
  } catch {
    return '';
  }
};

export const parseNaturalDate = (naturalDate: string): string => {
  // Simple natural language date parsing
  const today = new Date();
  const currentYear = today.getFullYear();
  
  // Handle formats like "January 15, 1990", "01/15/1990", "1990-01-15"
  const patterns = [
    /(\d{1,2})\/(\d{1,2})\/(\d{4})/,  // MM/DD/YYYY
    /(\d{4})-(\d{1,2})-(\d{1,2})/,   // YYYY-MM-DD
    /(\w+)\s+(\d{1,2}),?\s+(\d{4})/  // Month DD, YYYY
  ];

  for (const pattern of patterns) {
    const match = naturalDate.match(pattern);
    if (match) {
      try {
        let year, month, day;
        
        if (pattern === patterns[0]) { // MM/DD/YYYY
          [, month, day, year] = match;
        } else if (pattern === patterns[1]) { // YYYY-MM-DD
          [, year, month, day] = match;
        } else { // Month DD, YYYY
          [, month, day, year] = match;
          const monthNames = ['january', 'february', 'march', 'april', 'may', 'june',
                             'july', 'august', 'september', 'october', 'november', 'december'];
          const monthIndex = monthNames.indexOf(month.toLowerCase());
          month = (monthIndex + 1).toString();
        }
        
        const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
        return date.toISOString().split('T')[0];
      } catch {
        continue;
      }
    }
  }
  
  return '';
};

// Phone number formatting helpers
export const formatPhoneNumber = (phone: string): string => {
  const cleaned = phone.replace(/\D/g, '');
  
  if (cleaned.length === 10) {
    return `+1${cleaned}`;
  } else if (cleaned.length === 11 && cleaned.startsWith('1')) {
    return `+${cleaned}`;
  }
  
  return phone;
};

export const parseNaturalPhoneNumber = (naturalPhone: string): string => {
  // Remove common words and extract numbers
  const cleaned = naturalPhone
    .toLowerCase()
    .replace(/[^\d\+\-\(\)\s]/g, '')
    .replace(/\D/g, '');
  
  return formatPhoneNumber(cleaned);
};