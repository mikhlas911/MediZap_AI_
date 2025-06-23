import React, { useState } from 'react';
import { Calendar, Clock, User, Phone, Mail, Mic, MessageSquare } from 'lucide-react';
import { VoiceAgentModal } from '../voice/VoiceAgentModal';
import { GuestSignupForm } from '../auth/GuestSignupForm';
import { useDepartments, useDoctors } from '../../hooks/useSupabaseData';
import { supabase } from '../../lib/supabase';

interface PatientAppointmentBookingProps {
  clinicId: string;
  clinicName: string;
  userType?: 'guest' | 'patient' | 'premium';
  patientData?: {
    id?: string;
    name?: string;
    email?: string;
    phone?: string;
  };
}

export function PatientAppointmentBooking({
  clinicId,
  clinicName,
  userType = 'guest',
  patientData
}: PatientAppointmentBookingProps) {
  const [showVoiceAgent, setShowVoiceAgent] = useState(false);
  const [showGuestSignup, setShowGuestSignup] = useState(false);
  const [bookingMethod, setBookingMethod] = useState<'form' | 'voice' | null>(null);
  const [appointmentData, setAppointmentData] = useState<any>(null);

  const { departments } = useDepartments();
  const { doctors } = useDoctors();

  const handleVoiceBooking = () => {
    setBookingMethod('voice');
    setShowVoiceAgent(true);
  };

  const handleFormBooking = () => {
    setBookingMethod('form');
    // Implement form booking logic
  };

  const handleAppointmentBooked = (appointment: any) => {
    setAppointmentData(appointment);
    setShowVoiceAgent(false);
    
    // If guest user, prompt for account creation
    if (userType === 'guest') {
      setShowGuestSignup(true);
    }
  };

  const handleGuestRegistered = (userData: any) => {
    setShowGuestSignup(false);
    // Update appointment with registered user data
    // This would typically involve updating the appointment record
  };

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
          <div className="bg-white rounded-lg p-4 shadow-sm border border-slate-200 mb-6">
            <h2 className="text-xl font-bold text-slate-800 mb-1">{clinicName}</h2>
            <p className="text-slate-600">Book Your Appointment</p>
          </div>
        </div>

        {/* Success Message */}
        {appointmentData && !showGuestSignup && (
          <div className="bg-green-50 border border-green-200 rounded-xl p-6 mb-8">
            <div className="flex items-start space-x-3">
              <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0">
                <Calendar className="h-4 w-4 text-white" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-green-800 mb-2">Appointment Booked Successfully!</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-green-700">
                  <div>
                    <p><span className="font-medium">Patient:</span> {appointmentData.patient_name}</p>
                    <p><span className="font-medium">Date:</span> {appointmentData.appointment_date}</p>
                    <p><span className="font-medium">Time:</span> {appointmentData.appointment_time}</p>
                  </div>
                  <div>
                    <p><span className="font-medium">Doctor:</span> Dr. {appointmentData.doctor_name}</p>
                    <p><span className="font-medium">Department:</span> {appointmentData.department_name}</p>
                    <p><span className="font-medium">ID:</span> {appointmentData.id}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Booking Methods */}
        {!appointmentData && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Voice Booking */}
            <div className="bg-white rounded-xl shadow-lg border border-slate-200 p-8">
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-gradient-to-br from-emerald-100 to-sky-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Mic className="h-8 w-8 text-emerald-600" />
                </div>
                <h3 className="text-xl font-bold text-slate-800 mb-2">Voice Booking</h3>
                <p className="text-slate-600">
                  Book your appointment using our AI voice assistant. Just speak naturally!
                </p>
              </div>

              <div className="space-y-4 mb-6">
                <div className="flex items-center space-x-3 text-sm text-slate-600">
                  <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
                  <span>Natural conversation in English, Hindi, or Malayalam</span>
                </div>
                <div className="flex items-center space-x-3 text-sm text-slate-600">
                  <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
                  <span>AI automatically finds available slots</span>
                </div>
                <div className="flex items-center space-x-3 text-sm text-slate-600">
                  <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
                  <span>Instant confirmation and booking</span>
                </div>
              </div>

              <button
                onClick={handleVoiceBooking}
                className="w-full px-6 py-3 bg-gradient-to-r from-emerald-600 to-sky-600 text-white rounded-lg hover:from-emerald-700 hover:to-sky-700 transition-all duration-200 font-medium"
              >
                <Mic className="h-5 w-5 mr-2 inline" />
                Start Voice Booking
              </button>
            </div>

            {/* Form Booking */}
            <div className="bg-white rounded-xl shadow-lg border border-slate-200 p-8">
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-gradient-to-br from-sky-100 to-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <MessageSquare className="h-8 w-8 text-sky-600" />
                </div>
                <h3 className="text-xl font-bold text-slate-800 mb-2">Form Booking</h3>
                <p className="text-slate-600">
                  Traditional booking form with step-by-step selection process.
                </p>
              </div>

              <div className="space-y-4 mb-6">
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
              </div>

              <button
                onClick={handleFormBooking}
                className="w-full px-6 py-3 bg-gradient-to-r from-sky-600 to-blue-600 text-white rounded-lg hover:from-sky-700 hover:to-blue-700 transition-all duration-200 font-medium"
              >
                <MessageSquare className="h-5 w-5 mr-2 inline" />
                Use Booking Form
              </button>
            </div>
          </div>
        )}

        {/* User Type Badge */}
        <div className="text-center mt-8">
          <div className={`inline-flex items-center px-4 py-2 rounded-full text-sm font-medium ${
            userType === 'guest' 
              ? 'bg-slate-100 text-slate-700' 
              : userType === 'premium'
              ? 'bg-emerald-100 text-emerald-700'
              : 'bg-sky-100 text-sky-700'
          }`}>
            <User className="h-4 w-4 mr-2" />
            {userType === 'guest' ? 'Guest User' : userType === 'premium' ? 'Premium Patient' : 'Registered Patient'}
            {patientData?.name && (
              <span className="ml-2">• {patientData.name}</span>
            )}
          </div>
        </div>

        {/* Clinic Info */}
        <div className="mt-8 bg-white rounded-lg p-6 shadow-sm border border-slate-200">
          <h3 className="text-lg font-medium text-slate-800 mb-4">Available Services</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {departments.map((dept) => (
              <div key={dept.id} className="flex items-center space-x-3 p-3 bg-slate-50 rounded-lg">
                <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
                <span className="text-sm text-slate-700">{dept.name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Voice Agent Modal */}
      <VoiceAgentModal
        isOpen={showVoiceAgent}
        onClose={() => setShowVoiceAgent(false)}
        userType={userType}
        patientName={patientData?.name}
        clinicId={clinicId}
        onAppointmentBooked={handleAppointmentBooked}
      />

      {/* Guest Signup Modal */}
      {showGuestSignup && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <GuestSignupForm
                onSwitchToLogin={() => setShowGuestSignup(false)}
                guestData={{
                  name: appointmentData?.patient_name,
                  phone: appointmentData?.phone_number,
                  email: patientData?.email
                }}
                onGuestRegistered={handleGuestRegistered}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}