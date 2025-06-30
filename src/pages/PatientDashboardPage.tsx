import React, { useState, useEffect } from 'react';
import { Building2, User, Calendar, Mic, MessageSquare, ArrowRight, MapPin, Phone, Zap } from 'lucide-react';
import { ClinicSelector } from '../components/ClinicSelector';
import { PatientAppointmentBooking } from '../components/patient/PatientAppointmentBooking';
import { useAuth } from '../components/auth/AuthProvider';
import { useAppointments } from '../hooks/useSupabaseData';

export function PatientDashboardPage() {
  const { user, signOut } = useAuth();
  const { appointments } = useAppointments();
  const [selectedClinic, setSelectedClinic] = useState<any>(null);
  const [showBooking, setShowBooking] = useState(false);
  const [bookingMethod, setBookingMethod] = useState<'voice' | 'form' | null>(null);

  // Extract patient data from user
  const patientData = {
    id: user?.id,
    name: user?.user_metadata?.full_name || `${user?.user_metadata?.first_name || ''} ${user?.user_metadata?.last_name || ''}`.trim() || '',
    email: user?.email || '',
    phone: user?.user_metadata?.phone || ''
  };

  const handleClinicSelect = (clinic: any) => {
    setSelectedClinic(clinic);
  };

  const handleStartBooking = (method: 'voice' | 'form' = 'voice') => {
    if (selectedClinic) {
      setBookingMethod(method);
      setShowBooking(true);
    }
  };

  const handleBackToDashboard = () => {
    setShowBooking(false);
    setBookingMethod(null);
  };
  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  // If booking is active, show the booking component
  if (showBooking && selectedClinic) {
    return (
      <div className="relative">
        {/* Back Button */}
        <div className="absolute top-4 left-4 z-10">
          <button
            onClick={handleBackToDashboard}
            className="inline-flex items-center px-4 py-2 bg-white border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 transition-colors shadow-sm"
          >
            <ArrowRight className="h-4 w-4 mr-2 rotate-180" />
            Back to Dashboard
          </button>
        </div>
        
        <PatientAppointmentBooking
        clinicId={selectedClinic.id}
        clinicName={selectedClinic.name}
        userType="patient"
        patientData={patientData}
        bookingMethod={bookingMethod || undefined}
      />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center space-x-3 mb-4">
            <img 
              src="/logo_symbol.png" 
              alt="MediZap AI" 
              className="h-12 w-12 object-contain"
            />
            <h1 className="text-3xl font-bold text-slate-800">MediZap AI</h1>
          </div>
          <div className="bg-white rounded-lg p-6 shadow-sm border border-slate-200 mb-6">
            <div className="flex items-center justify-center space-x-3 mb-3">
              <User className="h-6 w-6 text-emerald-600" />
              <h2 className="text-2xl font-bold text-slate-800">Welcome, {patientData.name || 'Patient'}</h2>
            </div>
            <p className="text-slate-600 mb-4">Select a clinic to book appointments with AI assistance</p>
            
            {/* User Info */}
            <div className="bg-slate-50 rounded-lg p-4 mb-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium text-slate-700">Email:</span>
                  <span className="text-slate-600 ml-2">{patientData.email}</span>
                </div>
                {patientData.phone && (
                  <div>
                    <span className="font-medium text-slate-700">Phone:</span>
                    <span className="text-slate-600 ml-2">{patientData.phone}</span>
                  </div>
                )}
              </div>
            </div>

            <button
              onClick={handleSignOut}
              className="text-sm text-slate-600 hover:text-slate-800 transition-colors"
            >
              Sign Out
            </button>
          </div>
        </div>

        {/* Clinic Selection */}
        <div className="bg-white rounded-xl shadow-lg border border-slate-200 mb-8 relative">
          <div className="bg-gradient-to-r from-emerald-50 to-sky-50 p-6 border-b border-slate-200">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-emerald-100 rounded-lg flex items-center justify-center">
                <Building2 className="h-6 w-6 text-emerald-600" />
              </div>
              <div>
                <h3 className="text-lg font-medium text-slate-800">Select a Clinic</h3>
                <p className="text-sm text-slate-600">Choose a clinic to book your appointment</p>
              </div>
            </div>
          </div>

          <div className="p-6">
            <ClinicSelector
              onClinicSelect={handleClinicSelect}
              selectedClinic={selectedClinic}
              placeholder="Search and select a clinic..."
            />

            {selectedClinic && (
              <div className="mt-6 animate-in slide-in-from-bottom duration-300">
                <div className="bg-slate-50 rounded-lg p-4 mb-4">
                  <div className="flex items-center space-x-3 mb-3">
                    <Building2 className="h-5 w-5 text-slate-600" />
                    <h4 className="font-medium text-slate-800">Selected Clinic</h4>
                  </div>
                  <div className="text-sm text-slate-600 space-y-1">
                    <p><span className="font-medium">Name:</span> {selectedClinic.name}</p>
                    {selectedClinic.address && (
                      <div className="flex items-start space-x-1">
                        <MapPin className="h-4 w-4 mt-0.5 flex-shrink-0" />
                        <span>{selectedClinic.address}</span>
                      </div>
                    )}
                    {selectedClinic.phone && (
                      <div className="flex items-center space-x-1">
                        <Phone className="h-4 w-4 flex-shrink-0" />
                        <span>{selectedClinic.phone}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Booking Method Selection */}
                <div className="space-y-3">
                  <h4 className="font-medium text-slate-800 text-center">Choose Your Booking Method</h4>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {/* AI Voice Booking */}
                    <button
                      onClick={() => handleStartBooking('voice')}
                      className="flex items-center justify-center px-4 py-3 bg-gradient-to-r from-emerald-600 to-sky-600 text-white rounded-lg hover:from-emerald-700 hover:to-sky-700 transition-all duration-200 font-medium shadow-lg hover:shadow-xl"
                    >
                      <Mic className="h-5 w-5 mr-2" />
                      AI Voice Assistant
                    </button>
                    
                    {/* Traditional Form */}
                    <button
                      onClick={() => handleStartBooking('form')}
                      className="flex items-center justify-center px-4 py-3 bg-gradient-to-r from-sky-600 to-blue-600 text-white rounded-lg hover:from-sky-700 hover:to-blue-700 transition-all duration-200 font-medium shadow-lg hover:shadow-xl"
                    >
                      <MessageSquare className="h-5 w-5 mr-2" />
                      Traditional Form
                    </button>
                  </div>
                  
                  {/* Quick AI Access Button */}
                  <div className="pt-2 border-t border-slate-200">
                    <button
                      onClick={() => handleStartBooking('voice')}
                      className="w-full inline-flex items-center justify-center px-6 py-4 bg-gradient-to-r from-emerald-600 to-sky-600 text-white rounded-lg hover:from-emerald-700 hover:to-sky-700 transition-all duration-200 font-medium shadow-lg hover:shadow-xl text-lg"
                    >
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
                          <Zap className="h-5 w-5" />
                        </div>
                        <div className="text-left">
                          <div className="font-semibold">Start AI Conversation</div>
                          <div className="text-sm opacity-90">Book appointments with voice</div>
                        </div>
                      </div>
                      <ArrowRight className="h-5 w-5 ml-3" />
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Features Overview */}
        <div className="bg-white rounded-lg p-6 shadow-sm border border-slate-200">
          <h3 className="text-lg font-medium text-slate-800 mb-4">Available Booking Methods</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-start space-x-3 p-4 bg-emerald-50 rounded-lg border border-emerald-200">
              <Mic className="h-6 w-6 text-emerald-600 flex-shrink-0 mt-1" />
              <div>
                <h4 className="font-medium text-slate-800 mb-1">Voice Assistant</h4>
                <p className="text-sm text-slate-600">Book appointments using natural voice conversation with our advanced AI agent</p>
              </div>
            </div>
            <div className="flex items-start space-x-3 p-4 bg-sky-50 rounded-lg border border-sky-200">
              <MessageSquare className="h-6 w-6 text-sky-600 flex-shrink-0 mt-1" />
              <div>
                <h4 className="font-medium text-slate-800 mb-1">Traditional Form</h4>
                <p className="text-sm text-slate-600">Use step-by-step forms for manual appointment booking</p>
              </div>
            </div>
            <div className="flex items-start space-x-3 p-4 bg-purple-50 rounded-lg border border-purple-200 md:col-span-2">
              <Zap className="h-6 w-6 text-purple-600 flex-shrink-0 mt-1" />
              <div>
                <h4 className="font-medium text-slate-800 mb-1">MediZap AI Features</h4>
                <div className="text-sm text-slate-600 space-y-1">
                  <p>• Natural conversation in multiple languages</p>
                  <p>• Real-time availability checking and instant booking</p>
                  <p>• Smart doctor and department matching</p>
                  <p>• Automatic patient information management</p>
                </div>
              </div>
            </div>
          </div>
          
          <div className="mt-6 p-4 bg-gradient-to-r from-emerald-50 to-sky-50 rounded-lg border border-emerald-200">
            <div className="flex items-center space-x-3 mb-2">
              <img 
                src="/logo_symbol.png" 
                alt="MediZap AI" 
                className="h-6 w-6 object-contain"
              />
              <h4 className="font-medium text-slate-800">Powered by MediZap AI</h4>
            </div>
            <p className="text-sm text-slate-600">
              Experience the future of healthcare booking with our advanced conversational AI that understands your needs and books appointments instantly.
            </p>
          </div>
        </div>
        
        {/* Quick Tips */}
        <div className="bg-white rounded-lg p-6 shadow-sm border border-slate-200">
          <h3 className="text-lg font-medium text-slate-800 mb-4">Quick Tips for AI Voice Booking</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-start space-x-3 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <Calendar className="h-6 w-6 text-purple-600 flex-shrink-0 mt-1" />
              <div>
                <h4 className="font-medium text-slate-800 mb-1">Speak Naturally</h4>
                <p className="text-sm text-slate-600">Just say "I want to book an appointment" or "I need to see a cardiologist"</p>
              </div>
            </div>
            <div className="flex items-start space-x-3 p-4 bg-orange-50 rounded-lg border border-orange-200">
              <User className="h-6 w-6 text-orange-600 flex-shrink-0 mt-1" />
              <div>
                <h4 className="font-medium text-slate-800 mb-1">Your Info is Saved</h4>
                <p className="text-sm text-slate-600">As a registered patient, your details are automatically used for faster booking</p>
              </div>
            </div>
          </div>
        </div>
      </div>
        {/* Patient's Appointments */}
        {appointments.length > 0 && (
          <div className="bg-white rounded-xl shadow-lg border border-slate-200 mb-8">
            <div className="p-6 border-b border-slate-200">
              <h3 className="text-lg font-medium text-slate-800">Your Appointments</h3>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                {appointments.slice(0, 3).map((appointment) => (
                  <div key={appointment.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                    <div>
                      <h4 className="font-medium text-slate-800">Dr. {appointment.doctor.name}</h4>
                      <p className="text-sm text-slate-600">{appointment.department.name}</p>
                      <p className="text-sm text-slate-500">
                        {new Date(appointment.appointment_date).toLocaleDateString()} at {appointment.appointment_time}
                      </p>
                    </div>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      appointment.status === 'confirmed' ? 'bg-green-100 text-green-800' :
                      appointment.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-slate-100 text-slate-800'
                    }`}>
                      {appointment.status}
                    </span>
                  </div>
                ))}
              </div>
              {appointments.length > 3 && (
                <p className="text-sm text-slate-500 mt-4 text-center">
                  And {appointments.length - 3} more appointments...
                </p>
              )}
            </div>
          </div>
        )}
    </div>
  );
}