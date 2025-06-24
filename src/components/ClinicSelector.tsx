import React, { useState, useEffect } from 'react';
import { Search, Building2, MapPin, Phone, ChevronDown } from 'lucide-react';
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

export function ClinicSelector({ onClinicSelect, selectedClinic, placeholder = "Search for a clinic...", showError = true }: ClinicSelectorProps) {
  const [clinics, setClinics] = useState<Clinic[]>([]);
  const [filteredClinics, setFilteredClinics] = useState<Clinic[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchClinics();
  }, []);

  useEffect(() => {
    if (searchTerm) {
      const filtered = clinics.filter(clinic =>
        clinic.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        clinic.address?.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredClinics(filtered);
    } else {
      setFilteredClinics(clinics);
    }
  }, [searchTerm, clinics]);

  const fetchClinics = async () => {
    try {
      setLoading(true);
      
      // First try with authenticated access
      let { data, error } = await supabase
        .from('clinics')
        .select('id, name, address, phone, slug')
        .eq('is_active', true)
        .order('name');

      // If that fails (due to RLS), try with a more permissive approach
      if (error || !data || data.length === 0) {
        console.log('First query failed or returned no data, trying alternative approach:', error);
        
        // Try to get clinics without RLS restrictions for public access
        const { data: publicData, error: publicError } = await supabase
          .rpc('get_public_clinics');
        
        if (publicError) {
          console.log('RPC call failed, trying direct query:', publicError);
          
          // Last resort: try a simple query that might work with public access
          const { data: simpleData, error: simpleError } = await supabase
            .from('clinics')
            .select('id, name, address, phone, slug')
            .order('name');
          
          if (simpleError) throw simpleError;
          data = simpleData;
        } else {
          data = publicData;
        }
      }

      setClinics(data || []);
      setFilteredClinics(data || []);
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
    setSearchTerm('');
  };

  return (
    <div className="relative w-full">
      <div className="relative">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="w-full flex items-center justify-between px-4 py-3 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors"
        >
          <div className="flex items-center space-x-3">
            <Building2 className="h-5 w-5 text-slate-400" />
            <span className={selectedClinic ? 'text-slate-800' : 'text-slate-500'}>
              {selectedClinic ? selectedClinic.name : placeholder}
            </span>
          </div>
          <ChevronDown className={`h-5 w-5 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </button>

        {isOpen && (
          <div className="absolute z-50 w-full mt-2 bg-white border border-slate-300 rounded-lg shadow-lg max-h-80 overflow-hidden">
            {/* Search Input */}
            <div className="p-3 border-b border-slate-200">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search clinics..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-sm"
                  autoFocus
                />
              </div>
            </div>

            {/* Clinic List */}
            <div className="max-h-60 overflow-y-auto">
              {loading ? (
                <div className="p-4 text-center">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-emerald-600 mx-auto mb-2"></div>
                  <p className="text-sm text-slate-600">Loading clinics...</p>
                </div>
              ) : error && showError ? (
                <div className="p-4 text-center">
                  <div className="text-red-500 mb-2">⚠️</div>
                  <p className="text-sm text-red-600">{error}</p>
                  <button
                    onClick={fetchClinics}
                    className="mt-2 text-xs text-blue-600 hover:text-blue-700 underline"
                  >
                    Try Again
                  </button>
                </div>
              ) : filteredClinics.length > 0 ? (
                filteredClinics.map((clinic) => (
                  <button
                    key={clinic.id}
                    onClick={() => handleClinicSelect(clinic)}
                    className="w-full text-left p-4 hover:bg-slate-50 transition-colors border-b border-slate-100 last:border-b-0"
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
                  <p className="text-sm text-slate-600">
                    {searchTerm ? 'No clinics found matching your search' : 'No clinics available'}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  );
}