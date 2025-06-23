import React, { useState, useEffect } from 'react';
import { X, AlertCircle, CheckCircle, Phone } from 'lucide-react';
import { VoiceAgentUI } from './VoiceAgentUI';
import { useVoiceAgent } from '../../hooks/useVoiceAgent';

interface VoiceAgentModalProps {
  isOpen: boolean;
  onClose: () => void;
  userType?: 'guest' | 'patient' | 'premium';
  patientName?: string;
  clinicId?: string;
  onAppointmentBooked?: (appointment: any) => void;
}

export function VoiceAgentModal({
  isOpen,
  onClose,
  userType = 'guest',
  patientName,
  clinicId,
  onAppointmentBooked
}: VoiceAgentModalProps) {
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
    startListening,
    stopListening,
    endSession
  } = useVoiceAgent({
    clinicId,
    userType,
    patientName
  });

  const [showTranscript, setShowTranscript] = useState(false);

  // Handle appointment booking completion
  useEffect(() => {
    if (appointmentData && onAppointmentBooked) {
      onAppointmentBooked(appointmentData);
    }
  }, [appointmentData, onAppointmentBooked]);

  const handleClose = () => {
    endSession();
    onClose();
  };

  const handleStartListening = () => {
    startListening();
  };

  const handleStopListening = () => {
    stopListening();
  };

  const handleEndCall = () => {
    endSession();
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
                <h2 className="text-xl font-bold text-slate-800">AI Voice Assistant</h2>
                <p className="text-sm text-slate-600">Book appointments with voice commands</p>
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

        {/* Voice Agent UI */}
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

        {/* Success Display */}
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
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Conversation Display */}
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
              {transcript && (
                <div className="flex justify-end">
                  <div className="bg-blue-100 rounded-lg p-3 max-w-xs">
                    <div className="text-xs text-blue-600 mb-1">You</div>
                    <div className="text-sm text-slate-800">{transcript}</div>
                  </div>
                </div>
              )}
              
              {response && (
                <div className="flex justify-start">
                  <div className="bg-emerald-100 rounded-lg p-3 max-w-xs">
                    <div className="text-xs text-emerald-600 mb-1 flex items-center">
                      <img 
                        src="/logo_symbol.png" 
                        alt="AI" 
                        className="h-3 w-3 mr-1"
                      />
                      MediZap AI
                    </div>
                    <div className="text-sm text-slate-800">{response}</div>
                  </div>
                </div>
              )}

              {!transcript && !response && (
                <div className="text-center py-8">
                  <p className="text-slate-500 text-sm">Conversation will appear here</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Language Support Notice */}
        <div className="px-6 pb-6">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <div className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-white text-xs font-bold">i</span>
              </div>
              <div className="flex-1">
                <p className="text-sm text-blue-700 font-medium">Multi-Language Support</p>
                <p className="text-sm text-blue-600 mt-1">
                  Supports English, Hindi, and Malayalam. The AI will automatically detect your language.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}