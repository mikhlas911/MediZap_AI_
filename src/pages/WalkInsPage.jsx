import React, { useState, useEffect } from 'react';
import { Users, Plus, Search, Filter, Clock, Phone, User, Calendar, QrCode, Eye, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { useClinicContext } from '../hooks/useClinicContext';
import { supabase } from '../lib/supabase';
import { format } from 'date-fns';
import WalkInRegistrationForm from '../components/WalkInRegistrationForm';
import QRCodeManagement from '../components/QRCodeManagement';

const WalkInsPage = () => {
  const { clinicId } = useClinicContext();
  const [walkIns, setWalkIns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showRegistrationForm, setShowRegistrationForm] = useState(false);
  const [showQRManagement, setShowQRManagement] = useState(false);

  useEffect(() => {
    if (clinicId) {
      fetchWalkIns();
      
      // Set up real-time subscription
      const subscription = supabase
        .channel('walk_ins')
        .on('postgres_changes', 
          { 
            event: '*', 
            schema: 'public', 
            table: 'walk_ins',
            filter: `clinic_id=eq.${clinicId}`
          },
          () => {
            fetchWalkIns();
          }
        )
        .subscribe();

      return () => {
        subscription.unsubscribe();
      };
    }
  }, [clinicId]);

  const fetchWalkIns = async () => {
    if (!clinicId) {
      setWalkIns([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('walk_ins')
        .select('*')
        .eq('clinic_id', clinicId) // Filter by clinic_id
        .order('created_at', { ascending: false });

      if (error) throw error;
      setWalkIns(data || []);
    } catch (err) {
      console.error('Error fetching walk-ins:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const updateWalkInStatus = async (walkInId, newStatus) => {
    try {
      const { error } = await supabase
        .from('walk_ins')
        .update({ status: newStatus })
        .eq('id', walkInId);

      if (error) throw error;
    } catch (err) {
      console.error('Error updating walk-in status:', err);
      alert('Failed to update status: ' + err.message);
    }
  };

  const deleteWalkIn = async (walkInId) => {
    if (!confirm('Are you sure you want to delete this walk-in record?')) return;

    try {
      const { error } = await supabase
        .from('walk_ins')
        .delete()
        .eq('id', walkInId);

      if (error) throw error;
    } catch (err) {
      console.error('Error deleting walk-in:', err);
      alert('Failed to delete walk-in: ' + err.message);
    }
  };

  const filteredWalkIns = walkIns.filter(walkIn => {
    const matchesSearch = walkIn.patient_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         walkIn.contact_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         walkIn.patient_id?.toString().includes(searchTerm);
    
    const matchesStatus = statusFilter === 'all' || walkIn.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const getStatusColor = (status) => {
    switch (status) {
      case 'waiting':
        return 'bg-yellow-100 text-yellow-800';
      case 'in-progress':
        return 'bg-blue-100 text-blue-800';
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'waiting':
        return <Clock className="h-4 w-4" />;
      case 'in-progress':
        return <User className="h-4 w-4" />;
      case 'completed':
        return <CheckCircle className="h-4 w-4" />;
      case 'cancelled':
        return <XCircle className="h-4 w-4" />;
      default:
        return <AlertCircle className="h-4 w-4" />;
    }
  };

  if (showQRManagement) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <button
            onClick={() => setShowQRManagement(false)}
            className="inline-flex items-center px-4 py-2 text-slate-600 hover:text-slate-800 transition-colors"
          >
            ← Back to Walk-Ins
          </button>
        </div>
        <QRCodeManagement />
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="text-center">
          <Users className="h-16 w-16 mx-auto text-slate-400 animate-pulse mb-4" />
          <p className="text-slate-600">Loading walk-ins...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <p className="text-slate-600">Error loading walk-ins: {error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-slate-50 to-blue-50 rounded-xl p-6 border border-slate-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-emerald-100 rounded-lg flex items-center justify-center">
              <Users className="h-6 w-6 text-emerald-600" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-slate-800">Walk-In Patients</h1>
              <p className="text-slate-600 mt-1">Manage walk-in patient registrations</p>
            </div>
          </div>
          <div className="flex space-x-2">
            <button
              onClick={() => setShowQRManagement(true)}
              className="inline-flex items-center px-4 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-700 transition-colors"
            >
              <QrCode className="h-4 w-4 mr-2" />
              QR Codes
            </button>
            <button
              onClick={() => setShowRegistrationForm(true)}
              className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-emerald-600 to-sky-600 text-white rounded-lg hover:from-emerald-700 hover:to-sky-700 transition-all duration-200"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Walk-In
            </button>
          </div>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="bg-slate-50 rounded-lg shadow-sm border border-slate-200 p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0 md:space-x-4">
          <div className="flex-1 max-w-md">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search patients..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-white"
              />
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <Filter className="h-4 w-4 text-slate-500" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="border border-slate-300 rounded-lg px-3 py-2 bg-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              >
                <option value="all">All Status</option>
                <option value="waiting">Waiting</option>
                <option value="in-progress">In Progress</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
            <div className="text-sm text-slate-600">
              {filteredWalkIns.length} of {walkIns.length} patients
            </div>
          </div>
        </div>
      </div>

      {/* Walk-Ins List */}
      <div className="bg-slate-50 rounded-lg shadow-sm border border-slate-200">
        <div className="px-6 py-4 border-b border-slate-200">
          <h2 className="text-lg font-medium text-slate-800">All Walk-In Patients</h2>
        </div>
        <div className="p-6">
          {filteredWalkIns.length > 0 ? (
            <div className="space-y-4">
              {filteredWalkIns.map((walkIn) => (
                <div
                  key={walkIn.id}
                  className="bg-white rounded-lg border border-slate-200 p-6 hover:shadow-md transition-shadow duration-200"
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center">
                        <User className="h-5 w-5 text-emerald-600" />
                      </div>
                      <div>
                        <h3 className="text-lg font-medium text-slate-800">{walkIn.patient_name}</h3>
                        <p className="text-sm text-slate-500">ID: {walkIn.patient_id}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(walkIn.status)}`}>
                        {getStatusIcon(walkIn.status)}
                        <span className="ml-1 capitalize">{walkIn.status}</span>
                      </span>
                      <div className="flex items-center space-x-1">
                        <select
                          value={walkIn.status}
                          onChange={(e) => updateWalkInStatus(walkIn.id, e.target.value)}
                          className="text-xs border border-slate-300 rounded px-2 py-1"
                        >
                          <option value="waiting">Waiting</option>
                          <option value="in-progress">In Progress</option>
                          <option value="completed">Completed</option>
                          <option value="cancelled">Cancelled</option>
                        </select>
                        <button
                          onClick={() => deleteWalkIn(walkIn.id)}
                          className="p-1 text-red-600 hover:bg-red-50 rounded"
                          title="Delete walk-in"
                        >
                          <XCircle className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <div className="flex items-center text-sm text-slate-600">
                        <Calendar className="h-4 w-4 mr-2" />
                        DOB: {walkIn.date_of_birth ? format(new Date(walkIn.date_of_birth), 'MMM d, yyyy') : 'Not provided'}
                      </div>
                      <div className="flex items-center text-sm text-slate-600">
                        <User className="h-4 w-4 mr-2" />
                        {walkIn.Gender || 'Not specified'}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center text-sm text-slate-600">
                        <Phone className="h-4 w-4 mr-2" />
                        {walkIn.contact_number || 'No contact'}
                      </div>
                      <div className="text-sm text-slate-500">
                        Registered: {format(new Date(walkIn.created_at), 'MMM d, yyyy h:mm a')}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="text-sm text-slate-600">
                        <span className="font-medium">Reason:</span>
                      </div>
                      <div className="text-sm text-slate-700">
                        {walkIn.reason_for_visit || 'No reason provided'}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <Users className="h-12 w-12 text-slate-400 mx-auto mb-4" />
              <p className="text-slate-600">No walk-in patients found</p>
              <p className="text-sm text-slate-500 mt-1">
                {searchTerm || statusFilter !== 'all' 
                  ? 'Try adjusting your search or filter criteria'
                  : 'New walk-in registrations will appear here'
                }
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Registration Form Modal */}
      {showRegistrationForm && (
        <WalkInRegistrationForm
          onClose={() => setShowRegistrationForm(false)}
          onSuccess={() => {
            setShowRegistrationForm(false);
            fetchWalkIns();
          }}
        />
      )}
    </div>
  );
};

export { WalkInsPage }