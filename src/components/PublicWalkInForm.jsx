import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { User, Calendar, Phone, FileText, Building2, AlertCircle, CheckCircle, Save, ArrowLeft } from 'lucide-react';
import { supabase } from '../lib/supabase';

const PublicWalkInForm = () => {
  const { clinicSlug } = useParams();
  const navigate = useNavigate();
  
  const [clinic, setClinic] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [formData, setFormData] = useState({
    patient_name: '',
    patient_id: Math.floor(Math.random() * 1000000), // Reference ID for display
    date_of_birth: '',
    Gender: '',
    contact_number: '',
    reason_for_visit: '',
    status: 'waiting'
  });

  useEffect(() => {
    fetchClinicBySlug();
  }, [clinicSlug]);

  const fetchClinicBySlug = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('clinics')
        .select('id, name, phone, address, email')
        .eq('slug', clinicSlug)
        .eq('is_active', true)
        .single();

      if (error) throw error;

      if (!data) {
        setError('Clinic not found or inactive');
        return;
      }

      setClinic(data);
    } catch (err) {
      console.error('Error fetching clinic:', err);
      setError('Unable to load clinic information');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    if (error) setError(null);
  };

  const validateForm = () => {
    if (!formData.patient_name.trim()) {
      setError('Patient name is required');
      return false;
    }
    if (!formData.date_of_birth) {
      setError('Date of birth is required');
      return false;
    }
    if (!formData.Gender) {
      setError('Gender is required');
      return false;
    }
    if (!formData.contact_number.trim()) {
      setError('Contact number is required');
      return false;
    }
    if (!formData.reason_for_visit.trim()) {
      setError('Reason for visit is required');
      return false;
    }

    // Validate age
    const birthDate = new Date(formData.date_of_birth);
    const today = new Date();
    const age = today.getFullYear() - birthDate.getFullYear();
    if (age < 0 || age > 150) {
      setError('Please enter a valid date of birth');
      return false;
    }

    // Validate phone number
    const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
    if (!phoneRegex.test(formData.contact_number.replace(/\s/g, ''))) {
      setError('Please enter a valid contact number');
      return false;
    }

    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    if (!clinic?.id) {
      setError('Clinic information is not available. Please try again.');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      // CRITICAL: Do NOT include the 'id' field - let the identity column generate it automatically
      // Only include the necessary fields for the database
      const insertData = {
        clinic_id: clinic.id,
        patient_name: formData.patient_name,
        patient_id: formData.patient_id,
        date_of_birth: formData.date_of_birth,
        Gender: formData.Gender,
        contact_number: formData.contact_number,
        reason_for_visit: formData.reason_for_visit,
        status: formData.status
        // ✅ NO 'id' field - identity column generates it automatically
        // ✅ created_at will be set automatically by the default value
      };

      console.log('Inserting public walk-in data (no id field):', insertData);

      const { data, error: insertError } = await supabase
        .from('walk_ins')
        .insert([insertData])
        .select()
        .single();

      if (insertError) {
        console.error('Public insert error:', insertError);
        throw insertError;
      }

      console.log('Public walk-in registered successfully:', data);
      setSuccess(true);
    } catch (err) {
      console.error('Error registering patient:', err);
      setError(err.message || 'Failed to register. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto mb-4"></div>
          <p className="text-slate-600">Loading clinic information...</p>
        </div>
      </div>
    );
  }

  if (error && !clinic) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full text-center">
          <div className="bg-white rounded-xl shadow-lg p-8">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-slate-800 mb-2">Clinic Not Found</h2>
            <p className="text-slate-600 mb-6">{error}</p>
            <button
              onClick={() => navigate('/')}
              className="inline-flex items-center px-4 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-700 transition-colors"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Go Back
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          <div className="bg-white rounded-xl shadow-lg p-8 text-center">
            <CheckCircle className="h-16 w-16 text-green-600 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-slate-800 mb-2">Registration Successful!</h2>
            <p className="text-slate-600 mb-4">
              Thank you, {formData.patient_name}! You have been successfully registered as a walk-in patient.
            </p>
            <div className="bg-slate-50 rounded-lg p-4 mb-6">
              <p className="text-sm text-slate-600 mb-1">
                <span className="font-medium">Reference ID:</span> {formData.patient_id}
              </p>
              <p className="text-sm text-slate-600 mb-1">
                <span className="font-medium">Clinic:</span> {clinic.name}
              </p>
              <p className="text-sm text-slate-600">
                <span className="font-medium">Status:</span> Waiting
              </p>
            </div>
            <div className="text-sm text-slate-600 space-y-2">
              <p>Please wait to be called by clinic staff.</p>
              <p>Keep your Reference ID ready: <strong>{formData.patient_id}</strong></p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 py-8 px-4">
      <div className="max-w-2xl mx-auto">
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
            <h2 className="text-xl font-bold text-slate-800 mb-1">{clinic.name}</h2>
            <p className="text-slate-600">Walk-In Patient Registration</p>
            {clinic.address && (
              <p className="text-sm text-slate-500 mt-2">{clinic.address}</p>
            )}
          </div>
        </div>

        {/* Form */}
        <div className="bg-white rounded-xl shadow-lg border border-slate-200">
          <div className="p-6 border-b border-slate-200">
            <div className="flex items-center space-x-3">
              <User className="h-6 w-6 text-emerald-600" />
              <h3 className="text-lg font-medium text-slate-800">Patient Information</h3>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start space-x-3">
                <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Full Name */}
              <div className="md:col-span-2">
                <label htmlFor="patient_name" className="block text-sm font-medium text-slate-700 mb-2">
                  Full Name *
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-slate-400" />
                  <input
                    id="patient_name"
                    name="patient_name"
                    type="text"
                    required
                    value={formData.patient_name}
                    onChange={handleChange}
                    className="block w-full pl-10 pr-3 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors"
                    placeholder="Enter your full name"
                  />
                </div>
              </div>

              {/* Date of Birth */}
              <div>
                <label htmlFor="date_of_birth" className="block text-sm font-medium text-slate-700 mb-2">
                  Date of Birth *
                </label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-slate-400" />
                  <input
                    id="date_of_birth"
                    name="date_of_birth"
                    type="date"
                    required
                    value={formData.date_of_birth}
                    onChange={handleChange}
                    max={new Date().toISOString().split('T')[0]}
                    className="block w-full pl-10 pr-3 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors"
                  />
                </div>
              </div>

              {/* Gender */}
              <div>
                <label htmlFor="Gender" className="block text-sm font-medium text-slate-700 mb-2">
                  Gender *
                </label>
                <select
                  id="Gender"
                  name="Gender"
                  required
                  value={formData.Gender}
                  onChange={handleChange}
                  className="block w-full px-3 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors"
                >
                  <option value="">Select Gender</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                  <option value="Prefer not to say">Prefer not to say</option>
                </select>
              </div>

              {/* Contact Number */}
              <div className="md:col-span-2">
                <label htmlFor="contact_number" className="block text-sm font-medium text-slate-700 mb-2">
                  Contact Number *
                </label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-slate-400" />
                  <input
                    id="contact_number"
                    name="contact_number"
                    type="tel"
                    required
                    value={formData.contact_number}
                    onChange={handleChange}
                    className="block w-full pl-10 pr-3 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors"
                    placeholder="+1 (555) 123-4567"
                  />
                </div>
              </div>

              {/* Reason for Visit */}
              <div className="md:col-span-2">
                <label htmlFor="reason_for_visit" className="block text-sm font-medium text-slate-700 mb-2">
                  Reason for Visit *
                </label>
                <div className="relative">
                  <FileText className="absolute left-3 top-3 h-5 w-5 text-slate-400" />
                  <textarea
                    id="reason_for_visit"
                    name="reason_for_visit"
                    required
                    value={formData.reason_for_visit}
                    onChange={handleChange}
                    rows={4}
                    className="block w-full pl-10 pr-3 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors resize-none"
                    placeholder="Describe your symptoms or reason for the visit..."
                  />
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <div className="pt-4">
              <button
                type="submit"
                disabled={submitting}
                className="w-full inline-flex items-center justify-center px-6 py-3 bg-gradient-to-r from-emerald-600 to-sky-600 text-white rounded-lg hover:from-emerald-700 hover:to-sky-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 text-lg font-medium"
              >
                {submitting ? (
                  <div className="flex items-center">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                    Registering...
                  </div>
                ) : (
                  <>
                    <Save className="h-5 w-5 mr-2" />
                    Register for Walk-In
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Footer */}
          <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 rounded-b-xl">
            <div className="flex items-center justify-center space-x-2 text-sm text-slate-600">
              <AlertCircle className="h-4 w-4" />
              <span>Your information is securely stored and will only be used for medical purposes.</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};


export { PublicWalkInForm }