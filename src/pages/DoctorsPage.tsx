import React, { useState } from 'react';
import { Users, Plus, Search, Edit, Trash2, Phone, Calendar, Clock, MapPin, Save, X, Building2 } from 'lucide-react';
import { useDoctors, useDepartments } from '../hooks/useSupabaseData';
import { useClinicContext } from '../hooks/useClinicContext';
import { supabase } from '../lib/supabase';

interface DoctorFormData {
  name: string;
  phone: string;
  department_id: string;
  available_days: string[];
  available_times: string[];
}

interface NewDepartmentData {
  name: string;
  description: string;
}

const DAYS_OF_WEEK = [
  'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'
];

const DEFAULT_TIME_SLOTS = [
  '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
  '14:00', '14:30', '15:00', '15:30', '16:00', '16:30', '17:00'
];

export function DoctorsPage() {
  const { clinicId } = useClinicContext();
  const { doctors, loading, error } = useDoctors();
  const { departments, refetch: refetchDepartments } = useDepartments();
  const [searchTerm, setSearchTerm] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [showDepartmentForm, setShowDepartmentForm] = useState(false);
  const [editingDoctor, setEditingDoctor] = useState<any>(null);
  const [formData, setFormData] = useState<DoctorFormData>({
    name: '',
    phone: '',
    department_id: '',
    available_days: [],
    available_times: []
  });
  const [newDepartmentData, setNewDepartmentData] = useState<NewDepartmentData>({
    name: '',
    description: ''
  });

  const filteredDoctors = doctors.filter(doctor =>
    doctor.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    doctor.specialization?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    doctor.phone?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const resetForm = () => {
    setFormData({
      name: '',
      phone: '',
      department_id: '',
      available_days: [],
      available_times: []
    });
    setEditingDoctor(null);
    setShowForm(false);
  };

  const resetDepartmentForm = () => {
    setNewDepartmentData({
      name: '',
      description: ''
    });
    setShowDepartmentForm(false);
  };

  const handleEdit = (doctor: any) => {
    setFormData({
      name: doctor.name,
      phone: doctor.phone || '',
      department_id: doctor.department_id,
      available_days: doctor.available_days || [],
      available_times: doctor.available_times || []
    });
    setEditingDoctor(doctor);
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.department_id) {
      alert('Please fill in all required fields');
      return;
    }

    try {
      const doctorData = {
        ...formData,
        clinic_id: clinicId,
        is_active: true
        // Note: specialization will be automatically set by the database trigger
      };

      if (editingDoctor) {
        const { error } = await supabase
          .from('doctors')
          .update(doctorData)
          .eq('id', editingDoctor.id);
        
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('doctors')
          .insert([doctorData]);
        
        if (error) throw error;
      }

      resetForm();
    } catch (err: any) {
      console.error('Error saving doctor:', err);
      alert('Error saving doctor: ' + err.message);
    }
  };

  const handleDepartmentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newDepartmentData.name) {
      alert('Please enter a department name');
      return;
    }

    try {
      const { data, error } = await supabase
        .from('departments')
        .insert([{
          clinic_id: clinicId,
          name: newDepartmentData.name,
          description: newDepartmentData.description,
          is_active: true
        }])
        .select()
        .single();

      if (error) throw error;

      // Manually refresh departments to ensure immediate update
      await refetchDepartments();
      
      // Set the newly created department as selected
      setFormData(prev => ({ ...prev, department_id: data.id }));
      resetDepartmentForm();
      
      // Show success message
      console.log('Department created successfully:', data.name);
    } catch (err: any) {
      console.error('Error creating department:', err);
      alert('Error creating department: ' + err.message);
    }
  };

  const handleDelete = async (doctorId: string) => {
    if (!confirm('Are you sure you want to delete this doctor?')) return;

    try {
      const { error } = await supabase
        .from('doctors')
        .delete()
        .eq('id', doctorId);

      if (error) throw error;
    } catch (err: any) {
      console.error('Error deleting doctor:', err);
      alert('Error deleting doctor: ' + err.message);
    }
  };

  const handleDayToggle = (day: string) => {
    setFormData(prev => ({
      ...prev,
      available_days: prev.available_days.includes(day)
        ? prev.available_days.filter(d => d !== day)
        : [...prev.available_days, day]
    }));
  };

  const handleTimeToggle = (time: string) => {
    setFormData(prev => ({
      ...prev,
      available_times: prev.available_times.includes(time)
        ? prev.available_times.filter(t => t !== time)
        : [...prev.available_times, time]
    }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="text-center">
          <Users className="h-16 w-16 mx-auto text-slate-400 animate-pulse mb-4" />
          <p className="text-slate-600">Loading doctors...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="text-center">
          <Users className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <p className="text-slate-600">Error loading doctors: {error}</p>
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
              <h1 className="text-3xl font-bold text-slate-800">Doctors</h1>
              <p className="text-slate-600 mt-1">Manage clinic doctors and their availability</p>
            </div>
          </div>
          <button
            onClick={() => setShowForm(true)}
            className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-emerald-600 to-sky-600 text-slate-50 rounded-lg hover:from-emerald-700 hover:to-sky-700 transition-all duration-200"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Doctor
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="bg-slate-50 rounded-lg shadow-sm border border-slate-200 p-6">
        <div className="flex items-center justify-between">
          <div className="flex-1 max-w-md">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search doctors..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-slate-50"
              />
            </div>
          </div>
          <div className="text-sm text-slate-600">
            {filteredDoctors.length} of {doctors.length} doctors
          </div>
        </div>
      </div>

      {/* Doctor Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-slate-200">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-slate-800">
                  {editingDoctor ? 'Edit Doctor' : 'Add New Doctor'}
                </h2>
                <button
                  onClick={resetForm}
                  className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  <X className="h-5 w-5 text-slate-500" />
                </button>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Doctor Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                    placeholder="Dr. John Smith"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Phone
                  </label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                    placeholder="+1 (555) 123-4567"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Department * <span className="text-xs text-slate-500">(Specialization will be set automatically)</span>
                </label>
                <div className="flex space-x-2">
                  <select
                    required
                    value={formData.department_id}
                    onChange={(e) => setFormData(prev => ({ ...prev, department_id: e.target.value }))}
                    className="flex-1 px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  >
                    <option value="">Select Department</option>
                    {departments.map(dept => (
                      <option key={dept.id} value={dept.id}>{dept.name}</option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => setShowDepartmentForm(true)}
                    className="px-3 py-2 border border-emerald-300 text-emerald-700 rounded-lg hover:bg-emerald-50 transition-colors"
                    title="Add new department"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
                {formData.department_id && (
                  <p className="text-xs text-slate-500 mt-1">
                    Specialization will be: {departments.find(d => d.id === formData.department_id)?.name}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-3">
                  Available Days
                </label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {DAYS_OF_WEEK.map(day => (
                    <label key={day} className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.available_days.includes(day)}
                        onChange={() => handleDayToggle(day)}
                        className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                      />
                      <span className="text-sm text-slate-700">{day}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-3">
                  Available Time Slots
                </label>
                <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
                  {DEFAULT_TIME_SLOTS.map(time => (
                    <label key={time} className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.available_times.includes(time)}
                        onChange={() => handleTimeToggle(time)}
                        className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                      />
                      <span className="text-sm text-slate-700">{time}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-emerald-600 to-sky-600 text-white rounded-lg hover:from-emerald-700 hover:to-sky-700 transition-all duration-200"
                >
                  <Save className="h-4 w-4 mr-2" />
                  {editingDoctor ? 'Update Doctor' : 'Add Doctor'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* New Department Form Modal */}
      {showDepartmentForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
            <div className="p-6 border-b border-slate-200">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-slate-800">Add New Department</h2>
                <button
                  onClick={resetDepartmentForm}
                  className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  <X className="h-5 w-5 text-slate-500" />
                </button>
              </div>
            </div>

            <form onSubmit={handleDepartmentSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Department Name *
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Building2 className="h-5 w-5 text-slate-400" />
                  </div>
                  <input
                    type="text"
                    required
                    value={newDepartmentData.name}
                    onChange={(e) => setNewDepartmentData(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full pl-10 pr-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                    placeholder="e.g., Cardiology, Pediatrics"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Description
                </label>
                <textarea
                  value={newDepartmentData.description}
                  onChange={(e) => setNewDepartmentData(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 resize-none"
                  rows={3}
                  placeholder="Brief description of the department"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={resetDepartmentForm}
                  className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-emerald-600 to-sky-600 text-white rounded-lg hover:from-emerald-700 hover:to-sky-700 transition-all duration-200"
                >
                  <Save className="h-4 w-4 mr-2" />
                  Add Department
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Doctors List */}
      <div className="bg-slate-50 rounded-lg shadow-sm border border-slate-200">
        <div className="px-6 py-4 border-b border-slate-200">
          <h2 className="text-lg font-medium text-slate-800">All Doctors</h2>
        </div>
        <div className="p-6">
          {filteredDoctors.length > 0 ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {filteredDoctors.map((doctor) => {
                const department = departments.find(d => d.id === doctor.department_id);
                return (
                  <div
                    key={doctor.id}
                    className="bg-white rounded-lg border border-slate-200 p-6 hover:shadow-md transition-shadow duration-200"
                  >
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center">
                          <Users className="h-6 w-6 text-emerald-600" />
                        </div>
                        <div>
                          <h3 className="text-lg font-medium text-slate-800">Dr. {doctor.name}</h3>
                          <p className="text-sm text-slate-500">{doctor.specialization || department?.name || 'No specialization'}</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-1">
                        <button
                          onClick={() => handleEdit(doctor)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Edit doctor"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(doctor.id)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Delete doctor"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div className="flex items-center text-sm text-slate-600">
                        <MapPin className="h-4 w-4 mr-2" />
                        {department?.name || 'No department assigned'}
                      </div>
                      
                      {doctor.phone && (
                        <div className="flex items-center text-sm text-slate-600">
                          <Phone className="h-4 w-4 mr-2" />
                          {doctor.phone}
                        </div>
                      )}

                      {doctor.available_days && doctor.available_days.length > 0 && (
                        <div className="space-y-2">
                          <div className="flex items-center text-sm text-slate-600">
                            <Calendar className="h-4 w-4 mr-2" />
                            Available Days:
                          </div>
                          <div className="flex flex-wrap gap-1">
                            {doctor.available_days.map(day => (
                              <span
                                key={day}
                                className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800"
                              >
                                {day.slice(0, 3)}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {doctor.available_times && doctor.available_times.length > 0 && (
                        <div className="space-y-2">
                          <div className="flex items-center text-sm text-slate-600">
                            <Clock className="h-4 w-4 mr-2" />
                            Available Times:
                          </div>
                          <div className="flex flex-wrap gap-1">
                            {doctor.available_times.slice(0, 6).map(time => (
                              <span
                                key={time}
                                className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-sky-100 text-sky-800"
                              >
                                {time}
                              </span>
                            ))}
                            {doctor.available_times.length > 6 && (
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-600">
                                +{doctor.available_times.length - 6} more
                              </span>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-12">
              <Users className="h-12 w-12 text-slate-400 mx-auto mb-4" />
              <p className="text-slate-600">No doctors found</p>
              <p className="text-sm text-slate-500 mt-1">
                {searchTerm 
                  ? 'Try adjusting your search criteria'
                  : 'Add your first doctor to get started'
                }
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}