import React, { useState, useEffect } from 'react';
import { X, Calendar, Clock, User, Phone, Mail, Building2, Users, Save, ChevronDown, AlertCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../auth/AuthProvider';

interface TraditionalBookingFormProps {
  isOpen: boolean;
  onClose: () => void;
  clinicId: string;
  clinicName: string;
  userType?: 'guest' | 'patient' | 'premium';
  patientData?: {
    id?: string;
    name?: string;
    email?: string;
    phone?: string;
  };
  onAppointmentBooked?: (appointment: any) => void;
  onPatientRegistered?: (patient: any) => void;
}

interface BookingFormData {
  patientName: string;
  patientPhone: string;
  patientEmail: string;
  departmentId: string;
  doctorId: string;
  appointmentDate: string;
  appointmentTime: string;
  notes: string;
}

export function TraditionalBookingForm({
  isOpen,
  onClose,
  clinicId,
  clinicName,
  userType = 'guest',
  patientData,
  onAppointmentBooked,
  onPatientRegistered
}: TraditionalBookingFormProps) {
  const { user } = useAuth();
  const [departments, setDepartments] = useState<any[]>([]);
  const [departmentsLoading, setDepartmentsLoading] = useState(true);
  const [doctors, setDoctors] = useState<any[]>([]);
  const [doctorsLoading, setDoctorsLoading] = useState(false);
  
  const [formData, setFormData] = useState<BookingFormData>({
    patientName: patientData?.name || '',
    patientPhone: patientData?.phone || '',
    patientEmail: patientData?.email || '',
    departmentId: '',
    doctorId: '',
    appointmentDate: '',
    appointmentTime: '',
    notes: ''
  });

  const [availableDoctors, setAvailableDoctors] = useState<any[]>([]);
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [availableDates, setAvailableDates] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState(1);

  // Fetch departments for the specific clinic
  useEffect(() => {
    const fetchDepartments = async () => {
      if (!clinicId) {
        setDepartments([]);
        setDepartmentsLoading(false);
        return;
      }

      try {
        setDepartmentsLoading(true);
        const { data, error } = await supabase
          .from('departments')
          .select('*')
          .eq('clinic_id', clinicId)
          .eq('is_active', true)
          .order('name');

        if (error) throw error;
        setDepartments(data || []);
      } catch (err) {
        console.error('Error fetching departments:', err);
        setDepartments([]);
      } finally {
        setDepartmentsLoading(false);
      }
    };

    fetchDepartments();
  }, [clinicId]);

  // Fetch doctors when department is selected
  useEffect(() => {
    if (formData.departmentId) {
      fetchDoctors();
      setFormData(prev => ({ ...prev, doctorId: '', appointmentDate: '', appointmentTime: '' }));
    } else {
      setAvailableDoctors([]);
    }
  }, [formData.departmentId]);

  const fetchDoctors = async () => {
    if (!clinicId || !formData.departmentId) {
      setAvailableDoctors([]);
      return;
    }

    try {
      setDoctorsLoading(true);
      const { data, error } = await supabase
        .from('doctors')
        .select('*')
        .eq('clinic_id', clinicId)
        .eq('department_id', formData.departmentId)
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      setAvailableDoctors(data || []);
    } catch (err) {
      console.error('Error fetching doctors:', err);
      setAvailableDoctors([]);
    } finally {
      setDoctorsLoading(false);
    }
  };
  // Get available time slots when doctor and date are selected
  useEffect(() => {
    if (formData.doctorId) {
      fetchAvailableDates();
    } else {
      setAvailableDates([]);
    }
  }, [formData.doctorId]);

  // Get available time slots when doctor and date are selected
  useEffect(() => {
    if (formData.doctorId && formData.appointmentDate) {
      fetchAvailableSlots();
    } else {
      setAvailableSlots([]);
    }
  }, [formData.doctorId, formData.appointmentDate]);

  const fetchAvailableDates = async () => {
    try {
      const selectedDoctor = availableDoctors.find(d => d.id === formData.doctorId);
      if (!selectedDoctor || !selectedDoctor.available_days) {
        setAvailableDates([]);
        return;
      }

      // Generate available dates for the next 3 months based on doctor's available days
      const availableDays = selectedDoctor.available_days;
      const dates: string[] = [];
      const today = new Date();
      const endDate = new Date();
      endDate.setMonth(endDate.getMonth() + 3);

      for (let date = new Date(today); date <= endDate; date.setDate(date.getDate() + 1)) {
        const dayOfWeek = date.toLocaleDateString('en-US', { weekday: 'long' });
        if (availableDays.includes(dayOfWeek)) {
          dates.push(date.toISOString().split('T')[0]);
        }
      }

      setAvailableDates(dates);
    } catch (err) {
      console.error('Error calculating available dates:', err);
      setAvailableDates([]);
    }
  };
  const fetchAvailableSlots = async () => {
    try {
      const selectedDoctor = availableDoctors.find(d => d.id === formData.doctorId);
      if (!selectedDoctor || !selectedDoctor.available_times) {
        setAvailableSlots([]);
        return;
      }

      // Check if doctor is available on selected day
      const dayOfWeek = new Date(formData.appointmentDate).toLocaleDateString('en-US', { weekday: 'long' });
      if (!selectedDoctor.available_days?.includes(dayOfWeek)) {
        setAvailableSlots([]);
        return;
      }

      // Enhanced helper function to normalize time format to HH:MM (24-hour format)
      const normalizeTimeFormat = (timeString: string): string => {
        if (!timeString) return '';
        
        // Remove any whitespace
        const cleaned = timeString.trim();
        
        // Handle AM/PM format (e.g., "09:00 AM", "02:00 PM", "9:30 AM")
        const ampmMatch = cleaned.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
        if (ampmMatch) {
          let hour = parseInt(ampmMatch[1]);
          const minute = ampmMatch[2];
          const period = ampmMatch[3].toUpperCase();
          
          // Convert to 24-hour format
          if (period === 'AM') {
            if (hour === 12) hour = 0; // 12 AM = 00:xx
          } else { // PM
            if (hour !== 12) hour += 12; // 1 PM = 13:xx, but 12 PM = 12:xx
          }
          
          return hour.toString().padStart(2, '0') + ':' + minute;
        }
        
        // If already in HH:MM format, return as is
        if (/^\d{2}:\d{2}$/.test(cleaned)) {
          return cleaned;
        }
        
        // If in H:MM format, add leading zero
        if (/^\d{1}:\d{2}$/.test(cleaned)) {
          return '0' + cleaned;
        }
        
        // If in HH:M format, add trailing zero
        if (/^\d{2}:\d{1}$/.test(cleaned)) {
          return cleaned + '0';
        }
        
        // If in H:M format, add leading and trailing zeros
        if (/^\d{1}:\d{1}$/.test(cleaned)) {
          return '0' + cleaned + '0';
        }
        
        // If just a number (like "9" or "14"), assume it's hours
        if (/^\d{1,2}$/.test(cleaned)) {
          const hour = parseInt(cleaned);
          return hour.toString().padStart(2, '0') + ':00';
        }
        
        // Return original if no pattern matches
        return cleaned;
      };

      // Get existing appointments for this doctor on this date
      const { data: appointments, error } = await supabase
        .from('appointments')
        .select('appointment_time')
        .eq('doctor_id', formData.doctorId)
        .eq('appointment_date', formData.appointmentDate.trim())
        .in('status', ['pending', 'confirmed']);

      if (error) throw error;

      // Normalize booked times to consistent format
      const bookedTimes = appointments?.map(apt => normalizeTimeFormat(apt.appointment_time)) || [];
      
      // Normalize available times to consistent format
      const formattedAvailableTimes = selectedDoctor.available_times.map(time => normalizeTimeFormat(time));
      
      // Filter out booked time slots using normalized format
      const available = formattedAvailableTimes.filter(time => !bookedTimes.includes(time));
      
      setAvailableSlots(available.sort());
    } catch (err) {
      console.error('Error fetching available slots:', err);
      setAvailableSlots([]);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setError(null);
  };

  const validateStep = (stepNumber: number): boolean => {
    switch (stepNumber) {
      case 1:
        if (!formData.patientName.trim()) {
          setError('Patient name is required');
          return false;
        }
        if (!formData.patientPhone.trim()) {
          setError('Phone number is required');
          return false;
        }
        return true;
      case 2:
        if (!formData.departmentId) {
          setError('Please select a department');
          return false;
        }
        if (!formData.doctorId) {
          setError('Please select a doctor');
          return false;
        }
        return true;
      case 3:
        if (!formData.appointmentDate) {
          setError('Please select an appointment date');
          return false;
        }
        if (formData.doctorId && !isDateAvailable(formData.appointmentDate)) {
          setError('Selected date is not available for this doctor');
          return false;
        }
        if (!formData.appointmentTime) {
          setError('Please select an appointment time');
          return false;
        }
        return true;
      default:
        return true;
    }
  };

  const handleNext = () => {
    if (validateStep(step)) {
      setStep(step + 1);
    }
  };

  const handlePrevious = () => {
    setStep(step - 1);
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Additional validation for date availability
    if (formData.doctorId && formData.appointmentDate && !isDateAvailable(formData.appointmentDate)) {
      setError('Selected date is not available for this doctor. Please choose an available date.');
      return;
    }
    
    if (!validateStep(3)) return;

    setLoading(true);
    setError(null);

    try {
      // Book the appointment
      const appointmentData = {
        clinic_id: clinicId,
        department_id: formData.departmentId,
        doctor_id: formData.doctorId,
        patient_name: formData.patientName,
        phone_number: formData.patientPhone,
        email: formData.patientEmail || null,
        appointment_date: formData.appointmentDate,
        appointment_time: formData.appointmentTime,
        status: 'pending',
        notes: formData.notes || `Booked via traditional form on ${new Date().toISOString()}`,
        created_by: user?.id || null // Set the authenticated user as the creator
      };

      const { data: appointment, error: appointmentError } = await supabase
        .from('appointments')
        .insert([appointmentData])
        .select(`
          *,
          doctor:doctors(name, specialization),
          department:departments(name)
        `)
        .single();

      if (appointmentError) throw appointmentError;

      // Prepare appointment data for callback
      const appointmentResult = {
        ...appointment,
        doctor_name: appointment.doctor.name,
        department_name: appointment.department.name
      };

      // If guest user, register as patient
      if (userType === 'guest' && onPatientRegistered) {
        const patientResult = {
          id: `patient_${Date.now()}`,
          name: formData.patientName,
          phone: formData.patientPhone,
          email: formData.patientEmail
        };
        onPatientRegistered(patientResult);
      }

      if (onAppointmentBooked) {
        onAppointmentBooked(appointmentResult);
      }

      onClose();
    } catch (err: any) {
      console.error('Error booking appointment:', err);
      setError(err.message || 'Failed to book appointment. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const getMinDate = () => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  };

  const getMaxDate = () => {
    const maxDate = new Date();
    maxDate.setMonth(maxDate.getMonth() + 3);
    return maxDate.toISOString().split('T')[0];
  };

  const isDateAvailable = (dateString: string): boolean => {
    if (!formData.doctorId || availableDates.length === 0) {
      return true; // If no doctor selected, don't restrict dates
    }
    return availableDates.includes(dateString);
  };

  const getDateInputStyle = () => {
    const baseStyle = "w-full pl-10 pr-3 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-sky-500";
    return formData.doctorId ? `${baseStyle} date-picker-with-availability` : baseStyle;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="p-6 border-b border-slate-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-sky-100 rounded-lg flex items-center justify-center">
                <Calendar className="h-5 w-5 text-sky-600" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-800">Book Appointment</h2>
                <p className="text-sm text-slate-600">{clinicName}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <X className="h-5 w-5 text-slate-500" />
            </button>
          </div>

          {/* Progress Steps */}
          <div className="flex items-center space-x-4 mt-6">
            {[1, 2, 3, 4].map((stepNumber) => (
              <div key={stepNumber} className="flex items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  stepNumber <= step 
                    ? 'bg-sky-600 text-white' 
                    : 'bg-slate-200 text-slate-500'
                }`}>
                  {stepNumber}
                </div>
                {stepNumber < 4 && (
                  <div className={`w-12 h-1 mx-2 ${
                    stepNumber < step ? 'bg-sky-600' : 'bg-slate-200'
                  }`} />
                )}
              </div>
            ))}
          </div>
          <div className="flex justify-between text-xs text-slate-500 mt-2">
            <span>Patient Info</span>
            <span>Department</span>
            <span>Date & Time</span>
            <span>Confirm</span>
          </div>
        </div>

        {/* Form Content */}
        <form onSubmit={handleSubmit} className="p-6">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start space-x-3 mb-6">
              <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {/* Step 1: Patient Information */}
          {step === 1 && (
            <div className="space-y-6">
              <h3 className="text-lg font-medium text-slate-800 mb-4">Patient Information</h3>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Full Name *
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-slate-400" />
                  <input
                    type="text"
                    name="patientName"
                    required
                    value={formData.patientName}
                    onChange={handleChange}
                    className="w-full pl-10 pr-3 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
                    placeholder="Enter patient's full name"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Phone Number *
                </label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-slate-400" />
                  <input
                    type="tel"
                    name="patientPhone"
                    required
                    value={formData.patientPhone}
                    onChange={handleChange}
                    className="w-full pl-10 pr-3 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
                    placeholder="+1 (555) 123-4567"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Email Address (Optional)
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-slate-400" />
                  <input
                    type="email"
                    name="patientEmail"
                    value={formData.patientEmail}
                    onChange={handleChange}
                    className="w-full pl-10 pr-3 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
                    placeholder="patient@example.com"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Department and Doctor */}
          {step === 2 && (
            <div className="space-y-6">
              <h3 className="text-lg font-medium text-slate-800 mb-4">Select Department & Doctor</h3>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Department *
                </label>
                <div className="relative">
                  <Building2 className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-slate-400" />
                  <select
                    name="departmentId"
                    required
                    value={formData.departmentId}
                    onChange={handleChange}
                    disabled={departmentsLoading}
                    className="w-full pl-10 pr-10 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-sky-500 appearance-none disabled:bg-slate-100"
                  >
                    <option value="">
                      {departmentsLoading ? 'Loading departments...' : 'Select a department'}
                    </option>
                    {departments.map(dept => (
                      <option key={dept.id} value={dept.id}>{dept.name}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-slate-400" />
                </div>
                {departments.length === 0 && !departmentsLoading && (
                  <p className="text-sm text-orange-600 mt-2">
                    No departments available for this clinic. Please contact the clinic administrator.
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Doctor *
                </label>
                <div className="relative">
                  <Users className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-slate-400" />
                  <select
                    name="doctorId"
                    required
                    value={formData.doctorId}
                    onChange={handleChange}
                    disabled={!formData.departmentId || doctorsLoading}
                    className="w-full pl-10 pr-10 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-sky-500 appearance-none disabled:bg-slate-100"
                  >
                    <option value="">
                      {!formData.departmentId 
                        ? 'Select a department first' 
                        : doctorsLoading 
                        ? 'Loading doctors...' 
                        : 'Select a doctor'
                      }
                    </option>
                    {availableDoctors.map(doctor => (
                      <option key={doctor.id} value={doctor.id}>
                        {doctor.name} - {doctor.specialization}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-slate-400" />
                </div>
                {formData.departmentId && availableDoctors.length === 0 && !doctorsLoading && (
                  <p className="text-sm text-orange-600 mt-2">
                    No doctors available in this department. Please select a different department.
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Step 3: Date and Time */}
          {step === 3 && (
            <div className="space-y-6">
              <h3 className="text-lg font-medium text-slate-800 mb-4">Select Date & Time</h3>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Appointment Date *
                </label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-slate-400" />
                  <input
                    type="date"
                    name="appointmentDate"
                    required
                    value={formData.appointmentDate}
                    onChange={handleChange}
                    min={getMinDate()}
                    max={getMaxDate()}
                    className="w-full pl-10 pr-3 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Appointment Time *
                </label>
                <div className="relative">
                  <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-slate-400" />
                  <select
                    name="appointmentTime"
                    required
                    value={formData.appointmentTime}
                    onChange={handleChange}
                    disabled={!formData.appointmentDate}
                    className="w-full pl-10 pr-10 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-sky-500 appearance-none disabled:bg-slate-100"
                  >
                    <option value="">Select a time</option>
                    {availableSlots.map(slot => (
                      <option key={slot} value={slot}>
                        {(() => {
                          // Format the time slot for display - now handles normalized 24-hour format
                          try {
                            // slot is already normalized to HH:MM format by normalizeTimeFormat
                            const timeValue = slot;
                            
                            return new Date(`2000-01-01T${timeValue}`).toLocaleTimeString('en-US', {
                              hour: 'numeric',
                              minute: '2-digit',
                              hour12: true
                            });
                          } catch (err) {
                            console.error('Error formatting slot time:', err, slot);
                            return slot; // Fallback to original time format if parsing fails
                          }
                        })()}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-slate-400" />
                </div>
                {formData.appointmentDate && availableSlots.length === 0 && (
                  <p className="text-sm text-orange-600 mt-2">
                    No available slots for this date. Please select a different date.
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Notes (Optional)
                </label>
                <textarea
                  name="notes"
                  value={formData.notes}
                  onChange={handleChange}
                  rows={3}
                  className="w-full px-3 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-sky-500 resize-none"
                />
              </div>
              {formData.doctorId && (
                <div className="mt-2">
                  <p className="text-sm text-slate-600 mb-2">
                    Available days: {availableDoctors.find(d => d.id === formData.doctorId)?.available_days?.join(', ') || 'None'}
                  </p>
                  {formData.appointmentDate && !isDateAvailable(formData.appointmentDate) && (
                    <p className="text-sm text-red-600">
                      Selected date is not available. Please choose a date when the doctor is available.
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Step 4: Confirmation */}
          {step === 4 && (
            <div className="space-y-6">
              <h3 className="text-lg font-medium text-slate-800 mb-4">Confirm Appointment</h3>
              
              <div className="bg-slate-50 rounded-lg p-6 space-y-4">
                <div className="flex items-center space-x-2 mb-4">
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  <span className="text-sm text-slate-600">Available appointment slot confirmed</span>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-medium text-slate-700 mb-2">Patient Information</h4>
                    <p className="text-sm text-slate-600">Name: {formData.patientName}</p>
                    <p className="text-sm text-slate-600">Phone: {formData.patientPhone}</p>
                    {formData.patientEmail && (
                      <p className="text-sm text-slate-600">Email: {formData.patientEmail}</p>
                    )}
                  </div>
                  <div>
                    <h4 className="font-medium text-slate-700 mb-2">Appointment Details</h4>
                    <p className="text-sm text-slate-600">
                      Department: {departments.find(d => d.id === formData.departmentId)?.name}
                    </p>
                    <p className="text-sm text-slate-600">
                      Doctor: Dr. {availableDoctors.find(d => d.id === formData.doctorId)?.name}
                    </p>
                    <p className="text-sm text-slate-600">
                      Date: {new Date(formData.appointmentDate).toLocaleDateString('en-US', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </p>
                    <p className="text-sm text-slate-500">
                      Day: {new Date(formData.appointmentDate).toLocaleDateString('en-US', { weekday: 'long' })}
                    </p>
                    <p className="text-sm text-slate-600">
                      Time: {(() => {
                        try {
                          // formData.appointmentTime should already be in normalized HH:MM format
                          const timeValue = formData.appointmentTime;
                          
                          return new Date(`2000-01-01T${timeValue}`).toLocaleTimeString('en-US', {
                            hour: 'numeric',
                            minute: '2-digit',
                            hour12: true
                          });
                        } catch (err) {
                          console.error('Error formatting time:', err, formData.appointmentTime);
                          return formData.appointmentTime; // Fallback to original time format if parsing fails
                        }
                      })()}
                    </p>
                  </div>
                </div>
                {formData.notes && (
                  <div>
                    <h4 className="font-medium text-slate-700 mb-2">Notes</h4>
                    <p className="text-sm text-slate-600">{formData.notes}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Form Actions */}
          <div className="flex justify-between pt-6 border-t border-slate-200 mt-6">
            <div>
              {step > 1 && (
                <button
                  type="button"
                  onClick={handlePrevious}
                  className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
                >
                  Previous
                </button>
              )}
            </div>
            <div className="flex space-x-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              {step < 4 ? (
                <button
                  type="button"
                  onClick={handleNext}
                  className="px-6 py-2 bg-sky-600 text-white rounded-lg hover:bg-sky-700 transition-colors"
                >
                  Next
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={loading}
                  className="inline-flex items-center px-6 py-2 bg-gradient-to-r from-sky-600 to-emerald-600 text-white rounded-lg hover:from-sky-700 hover:to-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                >
                  {loading ? (
                    <div className="flex items-center">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Booking...
                    </div>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Book Appointment
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </form>
        
        {/* Add custom CSS for date picker styling */}
        <style jsx>{`
          .date-picker-with-availability::-webkit-calendar-picker-indicator {
            filter: invert(0.5);
          }
          
          /* Custom styling for unavailable dates - this is limited in HTML5 date inputs */
          .date-picker-with-availability {
            position: relative;
          }
        `}</style>
      </div>
    </div>
  );
}