import React, { useState, useEffect } from 'react';
import { Calendar, Clock, User, Phone, Mail, Mic, MessageSquare, UserPlus, Zap, Building2, MapPin, ChevronRight } from 'lucide-react';
import { AIVoiceOrb } from '../voice/AIVoiceOrb';
import { GuestSignupForm } from '../auth/GuestSignupForm';
import { TraditionalBookingForm } from './TraditionalBookingForm';
import { useDepartments, useDoctors } from '../../hooks/useSupabaseData';

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
  bookingMethod?: 'voice' | 'form';
}

export function PatientAppointmentBooking({
  clinicId,
  clinicName,
  userType = 'guest',
  patientData,
  bookingMethod
}: PatientAppointmentBookingProps) {
  const [showAIVoiceOrb, setShowAIVoiceOrb] = useState(false);
  const [showGuestSignup, setShowGuestSignup] = useState(false);
  const [showTraditionalForm, setShowTraditionalForm] = useState(false);
  const [selectedMethod, setSelectedMethod] = useState<'voice' | 'form' | null>(bookingMethod || null);
  const [appointmentData, setAppointmentData] = useState<any>(null);
  const [registeredPatientData, setRegisteredPatientData] = useState<any>(null);

  const { departments } = useDepartments();
  const { doctors } = useDoctors();

  // Auto-start based on URL parameter
  useEffect(() => {
    if (bookingMethod === 'voice') {
      handleVoiceBooking();
    } else if (bookingMethod === 'form') {
      handleFormBooking();
    }
  }, [bookingMethod]);

  const handleVoiceBooking = () => {
    setSelectedMethod('voice');
    setShowAIVoiceOrb(true);
  };

  const handleFormBooking = () => {
    setSelectedMethod('form');
    setShowTraditionalForm(true);
  };

  const handleAppointmentBooked = (appointment: any) => {
    setAppointmentData(appointment);
    setShowAIVoiceOrb(false);
    setShowTraditionalForm(false);
    
    // If guest user, prompt for account creation
    if (userType === 'guest' && !registeredPatientData) {
      setShowGuestSignup(true);
    }
  };

  const handlePatientRegistered = (patient: any) => {
    setRegisteredPatientData(patient);
  };

  const handleGuestRegistered = (userData: any) => {
    setShowGuestSignup(false);
    setRegisteredPatientData(userData);
  };

  const getUserTypeInfo = () => {
    const types = {
      guest: {
        icon: User,
        label: 'Guest User',
        color: 'bg-slate-100 text-slate-700',
        description: 'Book appointments without registration'
      },
      patient: {
        icon: User,
        label: 'Registered Patient',
        color: 'bg-sky-100 text-sky-700',
        description: 'Full access to appointment management'
      },
      premium: {
        icon: Zap,
        label: 'Premium Patient',
        color: 'bg-emerald-100 text-emerald-700',
        description: 'Priority booking and advanced features'
      }
    };
    return types[userType];
  };

  const typeInfo = getUserTypeInfo();
  const Icon = typeInfo.icon;

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
              <Building2 className="h-6 w-6 text-slate-600" />
              <h2 className="text-2xl font-bold text-slate-800">{clinicName}</h2>
            </div>
            <p className="text-slate-600 mb-4">AI-Powered Appointment Booking</p>
            
            {/* User Type Badge */}
            <div className="flex items-center justify-center space-x-3">
              <div className={`inline-flex items-center px-4 py-2 rounded-full text-sm font-medium ${typeInfo.color}`}>
                <Icon className="h-4 w-4 mr-2" />
                {typeInfo.label}
              </div>
              {patientData?.name && (
                <span className="text-slate-600">Welcome, {patientData.name}</span>
              )}
            </div>
            <p className="text-sm text-slate-500 mt-2">{typeInfo.description}</p>
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
                {registeredPatientData && (
                  <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-sm text-blue-700">
                      <span className="font-medium">Account Created:</span> You're now a registered patient with ID {registeredPatientData.id}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Patient Registration Success */}
        {registeredPatientData && !appointmentData && (
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 mb-8">
            <div className="flex items-start space-x-3">
              <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0">
                <UserPlus className="h-4 w-4 text-white" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-blue-800 mb-2">Patient Registration Complete!</h3>
                <div className="text-sm text-blue-700">
                  <p><span className="font-medium">Name:</span> {registeredPatientData.name}</p>
                  <p><span className="font-medium">Phone:</span> {registeredPatientData.phone}</p>
                  <p><span className="font-medium">Patient ID:</span> {registeredPatientData.id}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Booking Methods - Only show if no method selected */}
        {!selectedMethod && !appointmentData && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Voice Booking */}
            <div className="bg-white rounded-xl shadow-lg border border-slate-200 p-8">
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-gradient-to-br from-emerald-100 to-sky-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Mic className="h-8 w-8 text-emerald-600" />
                </div>
                <h3 className="text-xl font-bold text-slate-800 mb-2">AI Voice Assistant</h3>
                <p className="text-slate-600">
                  Book appointments using our advanced AI voice assistant. Just speak naturally!
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
                <div className="flex items-center space-x-3 text-sm text-slate-600">
                  <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
                  <span>Patient registration if needed</span>
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
                <h3 className="text-xl font-bold text-slate-800 mb-2">Traditional Booking</h3>
                <p className="text-slate-600">
                  Use our step-by-step form for appointment booking with manual selection.
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
                <div className="flex items-center space-x-3 text-sm text-slate-600">
                  <div className="w-2 h-2 bg-sky-500 rounded-full"></div>
                  <span>Review and confirm booking</span>
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
          
          {departments.length === 0 && (
            <div className="text-center py-8">
              <p className="text-slate-500">Loading available services...</p>
            </div>
          )}
        </div>

        {/* AI Features Notice */}
        <div className="mt-8 bg-gradient-to-r from-emerald-50 to-sky-50 rounded-lg border border-emerald-200 p-6">
          <div className="flex items-start space-x-4">
            <div className="flex-shrink-0">
              <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
                <Zap className="h-5 w-5 text-emerald-600" />
              </div>
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-medium text-slate-800 mb-2">
                Powered by MediZap AI
              </h3>
              <p className="text-slate-600 mb-4">
                Our AI voice assistant can help you with appointment booking, patient registration, and answering questions about our services.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <h4 className="font-medium text-slate-700 mb-2">Voice Features:</h4>
                  <ul className="space-y-1 text-slate-600">
                    <li>• Multi-language support</li>
                    <li>• Natural conversation flow</li>
                    <li>• Intelligent slot finding</li>
                    <li>• Automatic patient registration</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-medium text-slate-700 mb-2">Smart Capabilities:</h4>
                  <ul className="space-y-1 text-slate-600">
                    <li>• Real-time availability checking</li>
                    <li>• Doctor and department matching</li>
                    <li>• Appointment confirmation</li>
                    <li>• Follow-up scheduling</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* AI Voice Orb Modal */}
      <AIVoiceOrb
        isOpen={showAIVoiceOrb}
        onClose={() => {
          setShowAIVoiceOrb(false);
          setSelectedMethod(null);
        }}
        clinicId={clinicId}
      />

      {/* Traditional Booking Form Modal */}
      <TraditionalBookingForm
        isOpen={showTraditionalForm}
        onClose={() => {
          setShowTraditionalForm(false);
          setSelectedMethod(null);
        }}
        clinicId={clinicId}
        clinicName={clinicName}
        userType={userType}
        patientData={patientData}
        onAppointmentBooked={handleAppointmentBooked}
        onPatientRegistered={handlePatientRegistered}
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