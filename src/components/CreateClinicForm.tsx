import React, { useState } from 'react';
import { Building2, Mail, Phone, MapPin, Globe, AlertCircle, CheckCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface CreateClinicFormProps {
  userId: string;
  onClinicCreated: () => void;
  onCancel: () => void;
}

interface ClinicFormData {
  name: string;
  email: string;
  phone: string;
  address: string;
  website: string;
}

export function CreateClinicForm({ userId, onClinicCreated, onCancel }: CreateClinicFormProps) {
  const [formData, setFormData] = useState<ClinicFormData>({
    name: '',
    email: '',
    phone: '',
    address: '',
    website: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.email) {
      setError('Please fill in all required fields');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Use the secure function to create clinic with all related data
      const { data, error: functionError } = await supabase.rpc('create_clinic_with_admin', {
        clinic_name: formData.name,
        clinic_email: formData.email,
        clinic_phone: formData.phone || null,
        clinic_address: formData.address || null,
        clinic_website: formData.website || null
      });

      if (functionError) throw functionError;

      setSuccess(true);
      
      // Call the success callback after a short delay
      setTimeout(() => {
        onClinicCreated();
      }, 2000);

    } catch (err: any) {
      console.error('Clinic creation error:', err);
      
      // Provide user-friendly error messages
      let errorMessage = err.message || 'Failed to create clinic';
      
      if (err.message?.includes('clinic with this email already exists')) {
        errorMessage = 'A clinic with this email address already exists. Please use a different email.';
      } else if (err.message?.includes('User must be authenticated')) {
        errorMessage = 'Authentication error. Please sign out and sign back in.';
      } else if (err.message?.includes('Clinic name is required')) {
        errorMessage = 'Please enter a clinic name.';
      } else if (err.message?.includes('Clinic email is required')) {
        errorMessage = 'Please enter a clinic email address.';
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="max-w-md mx-auto">
        <div className="bg-slate-50 rounded-xl shadow-lg p-8 border border-emerald-200">
          <div className="text-center">
            <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="h-8 w-8 text-emerald-600" />
            </div>
            <h2 className="text-2xl font-bold text-slate-800 mb-2">Clinic Created Successfully!</h2>
            <p className="text-slate-600 mb-4">
              Your clinic has been registered and you've been set as the administrator. 
              Default departments have been created to get you started.
            </p>
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-emerald-600 mx-auto"></div>
            <p className="text-sm text-slate-500 mt-2">Redirecting to dashboard...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="text-center mb-8">
        <div className="flex items-center justify-center space-x-3 mb-4">
          <img 
            src="/logo_symbol.png" 
            alt="MediZap AI" 
            className="h-12 w-12 object-contain"
          />
          <h1 className="text-3xl font-bold text-slate-800">Register Your Clinic</h1>
        </div>
        <p className="text-slate-600">Set up your clinic to start using MediZap AI</p>
      </div>

      <form onSubmit={handleSubmit} className="bg-slate-50 rounded-xl shadow-lg p-8 border border-slate-200">
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start space-x-3 mb-6">
            <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm text-red-700 mb-2">{error}</p>
              {error.includes('email address already exists') && (
                <div className="text-xs text-red-600 space-y-1">
                  <p>• Try using a different email address</p>
                  <p>• Check if you already have an account with this clinic</p>
                  <p>• Contact support if you believe this is an error</p>
                </div>
              )}
            </div>
          </div>
        )}

        <div className="space-y-6">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-slate-700 mb-2">
              Clinic Name *
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Building2 className="h-5 w-5 text-slate-400" />
              </div>
              <input
                id="name"
                name="name"
                type="text"
                required
                value={formData.name}
                onChange={handleChange}
                className="block w-full pl-10 pr-3 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-sky-500 transition-colors bg-slate-50"
                placeholder="Enter your clinic name"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-2">
                Clinic Email *
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-slate-400" />
                </div>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  value={formData.email}
                  onChange={handleChange}
                  className="block w-full pl-10 pr-3 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-sky-500 transition-colors bg-slate-50"
                  placeholder="clinic@example.com"
                />
              </div>
            </div>

            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-slate-700 mb-2">
                Phone Number
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Phone className="h-5 w-5 text-slate-400" />
                </div>
                <input
                  id="phone"
                  name="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={handleChange}
                  className="block w-full pl-10 pr-3 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-sky-500 transition-colors bg-slate-50"
                  placeholder="+1 (555) 123-4567"
                />
              </div>
            </div>
          </div>

          <div>
            <label htmlFor="address" className="block text-sm font-medium text-slate-700 mb-2">
              Address
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <MapPin className="h-5 w-5 text-slate-400" />
              </div>
              <textarea
                id="address"
                name="address"
                rows={3}
                value={formData.address}
                onChange={handleChange}
                className="block w-full pl-10 pr-3 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-sky-500 transition-colors resize-none bg-slate-50"
                placeholder="Enter clinic address"
              />
            </div>
          </div>

          <div>
            <label htmlFor="website" className="block text-sm font-medium text-slate-700 mb-2">
              Website
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Globe className="h-5 w-5 text-slate-400" />
              </div>
              <input
                id="website"
                name="website"
                type="url"
                value={formData.website}
                onChange={handleChange}
                className="block w-full pl-10 pr-3 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-sky-500 transition-colors bg-slate-50"
                placeholder="https://www.yourclinic.com"
              />
            </div>
          </div>

          <div className="flex space-x-4">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 px-4 py-3 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-100 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-3 bg-gradient-to-r from-sky-600 to-emerald-600 text-slate-50 rounded-lg hover:from-sky-700 hover:to-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
            >
              {loading ? (
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-slate-50 mr-2"></div>
                  Creating Clinic...
                </div>
              ) : (
                'Create Clinic'
              )}
            </button>
          </div>
        </div>

        <div className="mt-6 text-center">
          <p className="text-sm text-slate-600">
            By creating a clinic, you agree to our terms of service and will be set as the clinic administrator.
          </p>
        </div>
      </form>
    </div>
  );
}