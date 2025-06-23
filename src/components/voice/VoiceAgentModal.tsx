import React, { useState, useEffect } from 'react';
import { X, AlertCircle, CheckCircle, Phone, Languages, Mic } from 'lucide-react';
import { VoiceAgentUI } from './VoiceAgentUI';
import { useVoiceAgent } from '../../hooks/useVoiceAgent';

interface VoiceAgentModalProps {
  isOpen: boolean;
  onClose: () => void;
  userType?: 'guest' | 'patient' | 'premium';
  patientName?: string;
  clinicId?: string;
  onAppointmentBooked?: (appointment: any) => void;
  onPatientRegistered?: (patient: any) => void;
}

export function VoiceAgentModal({
  isOpen,
  onClose,
  userType = 'guest',
  patientName,
  clinicId,
  onAppointmentBooked,
  onPatientRegistered
}: VoiceAgentModalProps) {
  const [selectedLanguage, setSelectedLanguage] = useState<'en' | 'hi' | 'ml'>('en');
  const [showLanguageSelector, setShowLanguageSelector] = useState(true);
  
  const {
    isConnected,
    isListening,
    isProcessing,
    isSpeaking,
    audioLevel,
    transcript,
    response,
    error,
    appointmentData,
    patientData,
    startListening,
    stopListening,
    endSession
  } = useVoiceAgent({
    clinicId,
    userType,
    patientName,
    language: selectedLanguage
  });

  const [showTranscript, setShowTranscript] = useState(false);
  const [conversationHistory, setConversationHistory] = useState<Array<{
    type: 'user' | 'agent';
    text: string;
    timestamp: Date;
  }>>([]);

  // Handle appointment booking completion
  useEffect(() => {
    if (appointmentData && onAppointmentBooked) {
      onAppointmentBooked(appointmentData);
    }
  }, [appointmentData, onAppointmentBooked]);

  // Handle patient registration completion
  useEffect(() => {
    if (patientData && onPatientRegistered) {
      onPatientRegistered(patientData);
    }
  }, [patientData, onPatientRegistered]);

  // Update conversation history
  useEffect(() => {
    if (transcript) {
      setConversationHistory(prev => [...prev, {
        type: 'user',
        text: transcript,
        timestamp: new Date()
      }]);
    }
  }, [transcript]);

  useEffect(() => {
    if (response) {
      setConversationHistory(prev => [...prev, {
        type: 'agent',
        text: response,
        timestamp: new Date()
      }]);
    }
  }, [response]);

  const handleClose = () => {
    endSession();
    onClose();
  };

  const handleLanguageSelect = (language: 'en' | 'hi' | 'ml') => {
    setSelectedLanguage(language);
    setShowLanguageSelector(false);
  };

  const handleStartListening = () => {
    if (showLanguageSelector) {
      setShowLanguageSelector(false);
    }
    startListening();
  };

  const handleStopListening = () => {
    stopListening();
  };

  const handleEndCall = () => {
    endSession();
  };

  const getLanguageInfo = () => {
    const languages = {
      en: { name: 'English', flag: '🇺🇸', description: 'English voice interaction' },
      hi: { name: 'हिंदी', flag: '🇮🇳', description: 'Hindi voice interaction' },
      ml: { name: 'മലയാളം', flag: '🇮🇳', description: 'Malayalam voice interaction' }
    };
    return languages[selectedLanguage];
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="p-6 border-b border-slate-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
                <Phone className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-800">MediZap AI Voice Assistant</h2>
                <div className="flex items-center space-x-2 text-sm text-slate-600">
                  <span>{getLanguageInfo().flag}</span>
                  <span>{getLanguageInfo().name}</span>
                  <span>•</span>
                  <span>{getLanguageInfo().description}</span>
                </div>
              </div>
            </div>
            <button
              onClick={handleClose}
              className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <X className="h-5 w-5 text-slate-500" />
            </button>
          </div>
        </div>

        {/* Language Selector */}
        {showLanguageSelector && (
          <div className="p-6 border-b border-slate-200 bg-gradient-to-r from-blue-50 to-emerald-50">
            <div className="text-center mb-4">
              <Languages className="h-8 w-8 text-emerald-600 mx-auto mb-2" />
              <h3 className="text-lg font-medium text-slate-800">Choose Your Language</h3>
              <p className="text-sm text-slate-600">Select your preferred language for voice interaction</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <button
                onClick={() => handleLanguageSelect('en')}
                className="p-4 border border-slate-200 rounded-lg hover:border-emerald-300 hover:bg-emerald-50 transition-all duration-200 text-center"
              >
                <div className="text-2xl mb-2">🇺🇸</div>
                <div className="font-medium text-slate-800">English</div>
                <div className="text-xs text-slate-500">Voice interaction in English</div>
              </button>
              <button
                onClick={() => handleLanguageSelect('hi')}
                className="p-4 border border-slate-200 rounded-lg hover:border-emerald-300 hover:bg-emerald-50 transition-all duration-200 text-center"
              >
                <div className="text-2xl mb-2">🇮🇳</div>
                <div className="font-medium text-slate-800">हिंदी</div>
                <div className="text-xs text-slate-500">Hindi voice interaction</div>
              </button>
              <button
                onClick={() => handleLanguageSelect('ml')}
                className="p-4 border border-slate-200 rounded-lg hover:border-emerald-300 hover:bg-emerald-50 transition-all duration-200 text-center"
              >
                <div className="text-2xl mb-2">🇮🇳</div>
                <div className="font-medium text-slate-800">മലയാളം</div>
                <div className="text-xs text-slate-500">Malayalam voice interaction</div>
              </button>
            </div>
          </div>
        )}

        {/* Voice Agent UI */}
        {!showLanguageSelector && (
          <div className="p-8">
            <VoiceAgentUI
              isActive={isConnected}
              isListening={isListening}
              isProcessing={isProcessing}
              isSpeaking={isSpeaking}
              isConnected={isConnected}
              audioLevel={audioLevel}
              onStartListening={handleStartListening}
              onStopListening={handleStopListening}
              onEndCall={handleEndCall}
              userType={userType}
              patientName={patientName}
            />
          </div>
        )}

        {/* Error Display */}
        {error && (
          <div className="mx-6 mb-4">
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start space-x-3">
              <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm text-red-700 font-medium">Voice Agent Error</p>
                <p className="text-sm text-red-600 mt-1">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Success Display - Appointment */}
        {appointmentData && (
          <div className="mx-6 mb-4">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-start space-x-3">
              <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm text-green-700 font-medium">Appointment Booked Successfully!</p>
                <div className="text-sm text-green-600 mt-2 space-y-1">
                  <p><span className="font-medium">Patient:</span> {appointmentData.patient_name}</p>
                  <p><span className="font-medium">Doctor:</span> Dr. {appointmentData.doctor_name}</p>
                  <p><span className="font-medium">Date:</span> {appointmentData.appointment_date}</p>
                  <p><span className="font-medium">Time:</span> {appointmentData.appointment_time}</p>
                  <p><span className="font-medium">Department:</span> {appointmentData.department_name}</p>
                  <p><span className="font-medium">ID:</span> {appointmentData.id}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Success Display - Patient Registration */}
        {patientData && (
          <div className="mx-6 mb-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-start space-x-3">
              <CheckCircle className="h-5 w-5 text-blue-500 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm text-blue-700 font-medium">Patient Registered Successfully!</p>
                <div className="text-sm text-blue-600 mt-2 space-y-1">
                  <p><span className="font-medium">Name:</span> {patientData.name}</p>
                  <p><span className="font-medium">Phone:</span> {patientData.phone}</p>
                  <p><span className="font-medium">Patient ID:</span> {patientData.id}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Conversation Display */}
        {!showLanguageSelector && (
          <div className="px-6 pb-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-slate-800">Conversation</h3>
              <button
                onClick={() => setShowTranscript(!showTranscript)}
                className="text-sm text-emerald-600 hover:text-emerald-700 transition-colors"
              >
                {showTranscript ? 'Hide' : 'Show'} Transcript
              </button>
            </div>

            {showTranscript && (
              <div className="bg-slate-50 rounded-lg p-4 max-h-64 overflow-y-auto space-y-3">
                {conversationHistory.map((message, index) => (
                  <div key={index} className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-xs rounded-lg p-3 ${
                      message.type === 'user' 
                        ? 'bg-blue-100 text-blue-900' 
                        : 'bg-emerald-100 text-emerald-900'
                    }`}>
                      <div className="text-xs mb-1 opacity-75">
                        {message.type === 'user' ? 'You' : (
                          <div className="flex items-center">
                            <img 
                              src="/logo_symbol.png" 
                              alt="AI" 
                              className="h-3 w-3 mr-1"
                            />
                            MediZap AI
                          </div>
                        )}
                      </div>
                      <div className="text-sm">{message.text}</div>
                    </div>
                  </div>
                ))}

                {conversationHistory.length === 0 && (
                  <div className="text-center py-8">
                    <Mic className="h-8 w-8 text-slate-400 mx-auto mb-2" />
                    <p className="text-slate-500 text-sm">Conversation will appear here</p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Language Support Notice */}
        {!showLanguageSelector && (
          <div className="px-6 pb-6">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start space-x-3">
                <Languages className="h-5 w-5 text-blue-500 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm text-blue-700 font-medium">Multi-Language AI Assistant</p>
                  <p className="text-sm text-blue-600 mt-1">
                    Currently using {getLanguageInfo().name}. The AI automatically adapts to your language and can help with appointment booking and patient registration.
                  </p>
                  <button
                    onClick={() => setShowLanguageSelector(true)}
                    className="text-xs text-blue-600 hover:text-blue-700 underline mt-2"
                  >
                    Change Language
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}