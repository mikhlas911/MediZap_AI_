import React, { useState } from 'react';
import { Calendar, Clock, User, Phone, MapPin, Plus, Search, Filter, Edit, Trash2, CheckCircle, XCircle } from 'lucide-react';
import { format } from 'date-fns';
import { useAppointments } from '../hooks/useSupabaseData';
import { supabase } from '../lib/supabase';

export function AppointmentsPage() {
  const { appointments, loading, error } = useAppointments();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedAppointment, setSelectedAppointment] = useState<any>(null);
  const [isEditing, setIsEditing] = useState(false);

  const filteredAppointments = appointments.filter(appointment => {
    const matchesSearch = appointment.patient_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         appointment.phone_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         appointment.doctor.name.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || appointment.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const handleStatusUpdate = async (appointmentId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('appointments')
        .update({ status: newStatus })
        .eq('id', appointmentId);

      if (error) throw error;
      
      // The useAppointments hook will automatically refresh due to real-time subscription
    } catch (err) {
      console.error('Error updating appointment status:', err);
    }
  };

  const handleDeleteAppointment = async (appointmentId: string) => {
    if (!confirm('Are you sure you want to delete this appointment?')) return;

    try {
      const { error } = await supabase
        .from('appointments')
        .delete()
        .eq('id', appointmentId);

      if (error) throw error;
    } catch (err) {
      console.error('Error deleting appointment:', err);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      case 'completed':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="text-center">
          <div className="relative mb-6">
            <Calendar className="h-16 w-16 mx-auto text-slate-400 animate-pulse" />
          </div>
          <p className="text-slate-600">Loading appointments...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="text-center">
          <XCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <p className="text-slate-600">Error loading appointments: {error}</p>
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
            <div className="w-12 h-12 bg-sky-100 rounded-lg flex items-center justify-center">
              <Calendar className="h-6 w-6 text-sky-600" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-slate-800">Appointments</h1>
              <p className="text-slate-600 mt-1">Manage all clinic appointments</p>
            </div>
          </div>
          <button className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-sky-600 to-emerald-600 text-slate-50 rounded-lg hover:from-sky-700 hover:to-emerald-700 transition-all duration-200">
            <Plus className="h-4 w-4 mr-2" />
            New Appointment
          </button>
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
                placeholder="Search appointments..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-sky-500 bg-slate-50"
              />
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <Filter className="h-4 w-4 text-slate-500" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="border border-slate-300 rounded-lg px-3 py-2 bg-slate-50 focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
              >
                <option value="all">All Status</option>
                <option value="pending">Pending</option>
                <option value="confirmed">Confirmed</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
            <div className="text-sm text-slate-600">
              {filteredAppointments.length} of {appointments.length} appointments
            </div>
          </div>
        </div>
      </div>

      {/* Appointments List */}
      <div className="bg-slate-50 rounded-lg shadow-sm border border-slate-200">
        <div className="px-6 py-4 border-b border-slate-200">
          <h2 className="text-lg font-medium text-slate-800">All Appointments</h2>
        </div>
        <div className="p-6">
          {filteredAppointments.length > 0 ? (
            <div className="space-y-4">
              {filteredAppointments.map((appointment) => (
                <div
                  key={appointment.id}
                  className="bg-white rounded-lg border border-slate-200 p-6 hover:shadow-md transition-shadow duration-200"
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-sky-100 rounded-full flex items-center justify-center">
                        <User className="h-5 w-5 text-sky-600" />
                      </div>
                      <div>
                        <h3 className="text-lg font-medium text-slate-800">{appointment.patient_name}</h3>
                        <p className="text-sm text-slate-500 flex items-center">
                          <Phone className="h-4 w-4 mr-1" />
                          {appointment.phone_number || 'No phone'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(appointment.status)}`}>
                        {appointment.status.charAt(0).toUpperCase() + appointment.status.slice(1)}
                      </span>
                      <div className="flex items-center space-x-1">
                        <button
                          onClick={() => handleStatusUpdate(appointment.id, appointment.status === 'confirmed' ? 'completed' : 'confirmed')}
                          className="p-1 text-green-600 hover:bg-green-50 rounded"
                          title={appointment.status === 'confirmed' ? 'Mark as completed' : 'Confirm appointment'}
                        >
                          <CheckCircle className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => setSelectedAppointment(appointment)}
                          className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                          title="Edit appointment"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteAppointment(appointment.id)}
                          className="p-1 text-red-600 hover:bg-red-50 rounded"
                          title="Delete appointment"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <div className="flex items-center text-sm text-slate-600">
                        <Calendar className="h-4 w-4 mr-2" />
                        {format(new Date(appointment.appointment_date), 'EEEE, MMMM d, yyyy')}
                      </div>
                      <div className="flex items-center text-sm text-slate-600">
                        <Clock className="h-4 w-4 mr-2" />
                        {appointment.appointment_time}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center text-sm text-slate-600">
                        <MapPin className="h-4 w-4 mr-2" />
                        {appointment.department.name}
                      </div>
                      <div className="text-sm text-slate-800 font-medium">
                        Dr. {appointment.doctor.name}
                      </div>
                      <div className="text-sm text-slate-500">
                        {appointment.doctor.specialization || appointment.department.name + ' Specialist'}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="text-sm text-slate-600">
                        <span className="font-medium">Appointment ID:</span> {appointment.id}
                      </div>
                      <div className="text-sm text-slate-500">
                        Created: {format(new Date(appointment.created_at), 'MMM d, yyyy')}
                      </div>
                    </div>
                  </div>

                  {appointment.notes && (
                    <div className="mt-4 p-3 bg-slate-50 rounded-md">
                      <p className="text-sm text-slate-700">
                        <span className="font-medium">Notes:</span> {appointment.notes}
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <Calendar className="h-12 w-12 text-slate-400 mx-auto mb-4" />
              <p className="text-slate-600">No appointments found</p>
              <p className="text-sm text-slate-500 mt-1">
                {searchTerm || statusFilter !== 'all' 
                  ? 'Try adjusting your search or filter criteria'
                  : 'New appointments will appear here'
                }
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}