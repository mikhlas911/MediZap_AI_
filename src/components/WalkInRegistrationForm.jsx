import React, { useState, useEffect } from 'react';
import { User, Calendar, Phone, FileText, Building2, Users, AlertCircle, CheckCircle, Save, X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useClinicContext } from '../hooks/useClinicContext';

const WalkInRegistrationForm = ({ onClose, onSuccess }) => {
  const { clinicId } = useClinicContext();
  const [formData, setFormData] = useState({
    patient_name: '',
    patient_id: Math.floor(Math.random() * 1000000), // Generate random patient ID for display
    date_of_birth: '',
    Gender: '',
    contact_number: '',
    reason_for_visit: '',
    status: 'waiting'
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    // Clear error when user starts typing
    if (error) {
      setError(null);
    }
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

    // Validate age (must be reasonable)
    const birthDate = new Date(formData.date_of_birth);
    const today = new Date();
    const age = today.getFullYear() - birthDate.getFullYear();
    if (age < 0 || age > 150) {
      setError('Please enter a valid date of birth');
      return false;
    }

    // Validate phone number format
    const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
    if (!phoneRegex.test(formData.contact_number.replace(/\s/g, ''))) {
      setError('Please enter a valid contact number');
      return false;
    }

    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    if (!clinicId) {
      setError('No clinic selected. Please ensure you are logged in and associated with a clinic.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // CRITICAL: Do NOT include the 'id' field - let the identity column generate it automatically
      // Only include the necessary fields for the database
      const insertData = {
        clinic_id: clinicid,
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

      console.log('Inserting walk-in data (no id field):', insertData);

      const { data, error: insertError } = await supabase
        .from('walk_ins')
        .insert([insertData])
        .select()
        .single();

      if (insertError) {
        console.error('Insert error:', insertError);
        throw insertError;
      }

      console.log('Walk-in registered successfully:', data);
      setSuccess(true);
      
      // Call success callback if provided
      if (onSuccess) {
        onSuccess(data);
      }

      // Auto-close after success
      setTimeout(() => {
        if (onClose) {
          onClose();
        }
      }, 2000);

    } catch (err) {
      console.error('Error registering walk-in patient:', err);
      setError(err.message || 'Failed to register patient. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      patient_name: '',
      patient_id: Math.floor(Math.random() * 1000000),
      date_of_birth: '',
      Gender: '',
      contact_number: '',
      reason_for_visit: '',
      status: 'waiting'
    });
    setError(null);
    setSuccess(false);
  };

  if (success) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
          <div className="p-8 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-slate-800 mb-2">Registration Successful!</h2>
            <p className="text-slate-600 mb-4">
              {formData.patient_name} has been successfully registered as a walk-in patient.
            </p>
            <div className="bg-slate-50 rounded-lg p-4 mb-6">
              <p className="text-sm text-slate-600">
                <span className="font-medium">Patient ID:</span> {formData.patient_id}
              </p>
              <p className="text-sm text-slate-600">
                <span className="font-medium">Status:</span> Waiting
              </p>
            </div>
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-green-600 mx-auto"></div>
            <p className="text-sm text-slate-500 mt-2">Closing automatically...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="p-6 border-b border-slate-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
                <Users className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-800">Walk-In Patient Registration</h2>
                <p className="text-sm text-slate-600">Register a new walk-in patient</p>
              </div>
            </div>
            {onClose && (
              <button
                onClick={onClose}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X className="h-5 w-5 text-slate-500" />
              </button>
            )}
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start space-x-3">
              <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Patient Name */}
            <div className="md:col-span-2">
              <label htmlFor="patient_name" className="block text-sm font-medium text-slate-700 mb-2">
                Full Name *
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <User className="h-5 w-5 text-slate-400" />
                </div>
                <input
                  id="patient_name"
                  name="patient_name"
                  type="text"
                  required
                  value={formData.patient_name}
                  onChange={handleChange}
                  className="block w-full pl-10 pr-3 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors bg-white"
                  placeholder="Enter patient's full name"
                />
              </div>
            </div>

            {/* Patient ID - Display only, not sent to database */}
            <div>
              <label htmlFor="patient_id" className="block text-sm font-medium text-slate-700 mb-2">
                Reference ID
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <FileText className="h-5 w-5 text-slate-400" />
                </div>
                <input
                  id="patient_id"
                  name="patient_id"
                  type="number"
                  value={formData.patient_id}
                  onChange={handleChange}
                  className="block w-full pl-10 pr-3 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors bg-slate-50"
                  placeholder="Auto-generated"
                  readOnly
                />
              </div>
              <p className="text-xs text-slate-500 mt-1">Reference ID for tracking (database will assign unique ID)</p>
            </div>

            {/* Date of Birth */}
            <div>
              <label htmlFor="date_of_birth" className="block text-sm font-medium text-slate-700 mb-2">
                Date of Birth *
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Calendar className="h-5 w-5 text-slate-400" />
                </div>
                <input
                  id="date_of_birth"
                  name="date_of_birth"
                  type="date"
                  required
                  value={formData.date_of_birth}
                  onChange={handleChange}
                  max={new Date().toISOString().split('T')[0]}
                  className="block w-full pl-10 pr-3 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors bg-white"
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
                className="block w-full px-3 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors bg-white"
              >
                <option value="">Select Gender</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
                <option value="Prefer not to say">Prefer not to say</option>
              </select>
            </div>

            {/* Contact Number */}
            <div>
              <label htmlFor="contact_number" className="block text-sm font-medium text-slate-700 mb-2">
                Contact Number *
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Phone className="h-5 w-5 text-slate-400" />
                </div>
                <input
                  id="contact_number"
                  name="contact_number"
                  type="tel"
                  required
                  value={formData.contact_number}
                  onChange={handleChange}
                  className="block w-full pl-10 pr-3 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors bg-white"
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
                <div className="absolute top-3 left-3 pointer-events-none">
                  <FileText className="h-5 w-5 text-slate-400" />
                </div>
                <textarea
                  id="reason_for_visit"
                  name="reason_for_visit"
                  required
                  value={formData.reason_for_visit}
                  onChange={handleChange}
                  rows={4}
                  className="block w-full pl-10 pr-3 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors resize-none bg-white"
                  placeholder="Describe the reason for the visit, symptoms, or concerns..."
                />
              </div>
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex justify-end space-x-3 pt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={resetForm}
              className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
            >
              Reset Form
            </button>
            {onClose && (
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
            )}
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-emerald-600 to-sky-600 text-white rounded-lg hover:from-emerald-700 hover:to-sky-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
            >
              {loading ? (
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Registering...
                </div>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Register Patient
                </>
              )}
            </button>
          </div>
        </form>

        {/* Footer Info */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 rounded-b-xl">
          <div className="flex items-center space-x-2 text-sm text-slate-600">
            <AlertCircle className="h-4 w-4" />
            <span>All fields marked with * are required. Patient information is securely stored.</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WalkInRegistrationForm;