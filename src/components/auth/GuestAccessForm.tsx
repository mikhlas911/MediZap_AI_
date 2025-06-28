import React, { useState } from 'react';
import { User, Search, Building2, ArrowRight, Mic, Zap, MessageSquare, Calendar, Phone } from 'lucide-react';
import { ClinicSelector } from '../ClinicSelector';
import { AIVoiceOrb } from '../voice/AIVoiceOrb';

interface GuestAccessFormProps {
  onSwitchToLogin: () => void;
}

export function GuestAccessForm({ onSwitchToLogin }: GuestAccessFormProps) {
  const [selectedClinic, setSelectedClinic] = useState<any>(null);
  const [showVoiceOrb, setShowVoiceOrb] = useState(false);

  const handleClinicSelect = (clinic: any) => {
    setSelectedClinic(clinic);
  };

  const handleVoiceBooking = () => {
    if (selectedClinic) {
      console.log('[DEBUG] Starting voice booking with clinic:', selectedClinic);
      setShowVoiceOrb(true);
    }
  };

  const handleTraditionalBooking = () => {
    if (selectedClinic) {
      window.location.href = `/book/${selectedClinic.slug}?method=form`;
    }
  };

  const handleAppointmentBooked = (appointment: any) => {
    console.log('Appointment booked:', appointment);
    setShowVoiceOrb(false);
    // Show success message or redirect
  };

  const handleWalkinRegistered = (walkin: any) => {
    console.log('Walk-in registered:', walkin);
    setShowVoiceOrb(false);
    // Show success message or redirect
  };

  return (
    <div className="w-full max-w-4xl mx-auto">
      <div className="text-center mb-8">
        <div className="flex items-center justify-center space-x-3 mb-4">
          <img 
            src="/logo_symbol.png" 
            alt="MediZap AI" 
            className="h-12 w-12 object-contain"
          />
          <h1 className="text-3xl font-bold text-slate-800">MediZap AI</h1>
        </div>
        <h2 className="text-xl font-semibold text-slate-800 mb-2">Guest Access</h2>
        <p className="text-slate-600">Book appointments without creating an account</p>
      </div>

      <div className="bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-50 to-sky-50 p-6 border-b border-slate-200">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-emerald-100 rounded-lg flex items-center justify-center">
              <User className="h-6 w-6 text-emerald-600" />
            </div>
            <div>
              <h3 className="text-lg font-medium text-slate-800">Quick Appointment Booking</h3>
              <p className="text-sm text-slate-600">Select a clinic and choose your preferred booking method</p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Step 1: Clinic Selection */}
          <div className="space-y-4">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-sky-100 rounded-full flex items-center justify-center">
                <span className="text-sm font-medium text-sky-600">1</span>
              </div>
              <h4 className="text-lg font-medium text-slate-800">Select a Clinic</h4>
            </div>
            
            <div className="ml-11">
              <ClinicSelector
                onClinicSelect={handleClinicSelect}
                selectedClinic={selectedClinic}
                placeholder="Search and select a clinic..."
              />
            </div>
          </div>

          {/* Step 2: Booking Method Selection */}
          {selectedClinic && (
            <div className="space-y-4 animate-in slide-in-from-bottom duration-300">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-emerald-100 rounded-full flex items-center justify-center">
                  <span className="text-sm font-medium text-emerald-600">2</span>
                </div>
                <h4 className="text-lg font-medium text-slate-800">Choose Booking Method</h4>
              </div>
              
              <div className="ml-11">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* AI Voice Booking */}
                  <div className="bg-gradient-to-br from-emerald-50 to-sky-50 rounded-xl p-6 border border-emerald-200 hover:border-emerald-300 transition-all duration-200">
                    <div className="text-center mb-4">
                      <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Mic className="h-8 w-8 text-emerald-600" />
                      </div>
                      <h5 className="text-xl font-bold text-slate-800 mb-2">AI Voice Assistant</h5>
                      <p className="text-slate-600 text-sm">
                        Book appointments using our advanced AI voice assistant. Just speak naturally!
                      </p>
                    </div>

                    <div className="space-y-3 mb-6">
                      <div className="flex items-center space-x-3 text-sm text-slate-600">
                        <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
                        <span>Natural conversation with AI</span>
                      </div>
                      <div className="flex items-center space-x-3 text-sm text-slate-600">
                        <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
                        <span>Appointment booking & walk-in registration</span>
                      </div>
                      <div className="flex items-center space-x-3 text-sm text-slate-600">
                        <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
                        <span>Answer questions about services</span>
                      </div>
                      <div className="flex items-center space-x-3 text-sm text-slate-600">
                        <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
                        <span>Instant confirmation and booking</span>
                      </div>
                    </div>

                    <button
                      onClick={handleVoiceBooking}
                      className="w-full inline-flex items-center justify-center px-6 py-3 bg-gradient-to-r from-emerald-600 to-sky-600 text-white rounded-lg hover:from-emerald-700 hover:to-sky-700 transition-all duration-200 font-medium shadow-lg hover:shadow-xl"
                    >
                      <Mic className="h-5 w-5 mr-2" />
                      Start AI Voice Chat
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </button>
                  </div>

                  {/* Traditional Form Booking */}
                  <div className="bg-gradient-to-br from-sky-50 to-blue-50 rounded-xl p-6 border border-sky-200 hover:border-sky-300 transition-all duration-200">
                    <div className="text-center mb-4">
                      <div className="w-16 h-16 bg-sky-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <MessageSquare className="h-8 w-8 text-sky-600" />
                      </div>
                      <h5 className="text-xl font-bold text-slate-800 mb-2">Traditional Booking</h5>
                      <p className="text-slate-600 text-sm">
                        Use our step-by-step form for appointment booking with manual selection.
                      </p>
                    </div>

                    <div className="space-y-3 mb-6">
                      <div className="flex items-center space-x-3 text-sm text-slate-600">
                        <div className="w-2 h-2 bg-sky-500 rounded-full"></div>
                        <span>Choose department and doctor</span>
                      </div>
                      <div className="flex items-center space-x-3 text-sm text-slate-600">
                        <div className="w-2 h-2 bg-sky-500 rounded-full"></div>
                        <span>Select date and time manually</span>
                      </div>
                      <div className="flex items-center space-x-3 text-sm text-slate-600">
                        <div className="w-2 h-2 bg-sky-500 rounded-full"></div>
                        <span>Fill in patient details</span>
                      </div>
                      <div className="flex items-center space-x-3 text-sm text-slate-600">
                        <div className="w-2 h-2 bg-sky-500 rounded-full"></div>
                        <span>Review and confirm booking</span>
                      </div>
                    </div>

                    <button
                      onClick={handleTraditionalBooking}
                      className="w-full inline-flex items-center justify-center px-6 py-3 bg-gradient-to-r from-sky-600 to-blue-600 text-white rounded-lg hover:from-sky-700 hover:to-blue-700 transition-all duration-200 font-medium shadow-lg hover:shadow-xl"
                    >
                      <MessageSquare className="h-5 w-5 mr-2" />
                      Use Booking Form
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Clinic Info Display */}
          {selectedClinic && (
            <div className="ml-11 bg-white rounded-lg border border-slate-200 p-4">
              <div className="flex items-center space-x-3 mb-3">
                <Building2 className="h-5 w-5 text-slate-600" />
                <h5 className="font-medium text-slate-800">Selected Clinic</h5>
              </div>
              <div className="text-sm text-slate-600 space-y-1">
                <p><span className="font-medium">Name:</span> {selectedClinic.name}</p>
                {selectedClinic.address && (
                  <p><span className="font-medium">Address:</span> {selectedClinic.address}</p>
                )}
                {selectedClinic.phone && (
                  <p><span className="font-medium">Phone:</span> {selectedClinic.phone}</p>
                )}
              </div>
            </div>
          )}

          {/* Features */}
          <div className="bg-slate-50 rounded-lg p-6">
            <h4 className="font-medium text-slate-800 mb-3">AI Voice Assistant Features</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm text-slate-600">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
                <span>Natural voice conversation</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
                <span>Appointment booking</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
                <span>Walk-in registration</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
                <span>FAQ and information</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200">
          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-600">
              Want to save your appointments and access more features?
            </p>
            <button
              onClick={onSwitchToLogin}
              className="text-sm text-sky-600 hover:text-sky-700 font-medium transition-colors"
            >
              Sign in to your account
            </button>
          </div>
        </div>
      </div>

      {/* AI Voice Orb Modal */}
      <AIVoiceOrb
        isOpen={showVoiceOrb}
        onClose={() => setShowVoiceOrb(false)}
        clinicId={selectedClinic?.id || 'default-clinic'}
        clinicName={selectedClinic?.name}
        onAppointmentBooked={handleAppointmentBooked}
        onWalkinRegistered={handleWalkinRegistered}
      />
    </div>
  );
}