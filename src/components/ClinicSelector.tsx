import React, { useState, useEffect } from 'react';
import { Building2, MapPin, Phone, ChevronDown } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface Clinic {
  id: string;
  name: string;
  address?: string;
  phone?: string;
  slug: string;
}

interface ClinicSelectorProps {
  onClinicSelect: (clinic: Clinic) => void;
  selectedClinic?: Clinic | null;
  placeholder?: string;
  showError?: boolean;
}

export function ClinicSelector({ onClinicSelect, selectedClinic, placeholder = "Select a clinic...", showError = true }: ClinicSelectorProps) {
  const [clinics, setClinics] = useState<Clinic[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchClinics();
  }, []);

  const fetchClinics = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('Fetching clinics using guest access logic...');
      
      // First try with authenticated access (same as guest access logic)
      let { data, error } = await supabase
        .from('clinics')
        .select('id, name, address, phone, slug')
        .eq('is_active', true)
        .order('name');

      // If that fails (due to RLS), try with the public RPC function
      if (error || !data || data.length === 0) {
        console.log('First query failed or returned no data, trying RPC approach:', error);
        
        // Try to get clinics using the public RPC function
        const { data: publicData, error: publicError } = await supabase
          .rpc('get_public_clinics');
        
        if (publicError) {
          console.log('RPC call failed, trying public policy access:', publicError);
          
          // Last resort: try a simple query that works with public access
          const { data: simpleData, error: simpleError } = await supabase
            .from('clinics')
            .select('id, name, address, phone, slug')
            .eq('is_active', true)
            .order('name');
          
          if (simpleError) {
            throw simpleError;
          }
          data = simpleData;
        } else {
          data = publicData;
        }
      }

      console.log('Clinics query result:', { data: data?.length || 0, error: null });

      setClinics(data || []);
      console.log('Clinics loaded successfully:', data?.length || 0);
    } catch (err) {
      console.error('Error fetching clinics:', err);
      setError('Unable to load clinics. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleClinicSelect = (clinic: Clinic) => {
    onClinicSelect(clinic);
    setIsOpen(false);
  };

  const toggleDropdown = () => {
    setIsOpen(!isOpen);
    if (!isOpen && clinics.length === 0) {
      fetchClinics();
    }
  };

  return (
    <div className="relative w-full">
      {/* Main Button */}
      <div className="relative">
        <button
          onClick={toggleDropdown}
          className="w-full flex items-center justify-between px-4 py-3 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors hover:border-slate-400"
        >
          <div className="flex items-center space-x-3">
            <Building2 className="h-5 w-5 text-slate-400" />
            <span className={selectedClinic ? 'text-slate-800' : 'text-slate-500'}>
              {selectedClinic ? selectedClinic.name : placeholder}
            </span>
          </div>
          <ChevronDown className={`h-5 w-5 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </button>

        {/* Dropdown */}
        {isOpen && (
          <div className="absolute z-[9999] w-full mt-2 bg-white border border-slate-300 rounded-lg shadow-xl max-h-80 overflow-hidden">
            {/* Clinic List */}
            <div className="max-h-72 overflow-y-auto">
              {loading ? (
                <div className="p-4 text-center">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-emerald-600 mx-auto mb-2"></div>
                  <p className="text-sm text-slate-600">Loading clinics...</p>
                </div>
              ) : error && showError ? (
                <div className="p-4 text-center">
                  <div className="text-red-500 mb-2">⚠️</div>
                  <p className="text-sm text-red-600 mb-2">{error}</p>
                  <button
                    onClick={fetchClinics}
                    className="text-xs text-blue-600 hover:text-blue-700 underline"
                  >
                    Try Again
                  </button>
                </div>
              ) : clinics.length > 0 ? (
                clinics.map((clinic) => (
                  <button
                    key={clinic.id}
                    onClick={() => handleClinicSelect(clinic)}
                    className="w-full text-left p-4 hover:bg-slate-50 transition-colors border-b border-slate-100 last:border-b-0 focus:bg-slate-50 focus:outline-none"
                  >
                    <div className="flex items-start space-x-3">
                      <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center flex-shrink-0">
                        <Building2 className="h-5 w-5 text-emerald-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-slate-800 truncate">{clinic.name}</h3>
                        {clinic.address && (
                          <div className="flex items-center text-sm text-slate-500 mt-1">
                            <MapPin className="h-3 w-3 mr-1 flex-shrink-0" />
                            <span className="truncate">{clinic.address}</span>
                          </div>
                        )}
                        {clinic.phone && (
                          <div className="flex items-center text-sm text-slate-500 mt-1">
                            <Phone className="h-3 w-3 mr-1 flex-shrink-0" />
                            <span>{clinic.phone}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </button>
                ))
              ) : (
                <div className="p-4 text-center">
                  <Building2 className="h-8 w-8 text-slate-400 mx-auto mb-2" />
                  <p className="text-sm text-slate-600">No clinics available</p>
                </div>
              )}
            </div>

            {/* Footer with clinic count */}
            {!loading && clinics.length > 0 && (
              <div className="px-4 py-2 bg-slate-50 border-t border-slate-200 text-xs text-slate-500">
                {clinics.length} clinic{clinics.length !== 1 ? 's' : ''} available
              </div>
            )}
          </div>
        )}
      </div>

      {/* Backdrop to close dropdown */}
      {isOpen && (
        <div
          className="fixed inset-0 z-[9998] bg-transparent"
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  );
}