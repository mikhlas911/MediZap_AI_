import React from 'react';
import { Calendar, Clock, User, Phone, MapPin } from 'lucide-react';
import { format } from 'date-fns';

interface AppointmentCardProps {
  appointment: {
    id: string;
    patient_name: string;
    phone_number: string;
    appointment_date: string;
    appointment_time: string;
    status: 'scheduled' | 'completed' | 'cancelled';
    notes?: string;
    doctor: {
      name: string;
      specialization: string;
    };
    department: {
      name: string;
    };
    created_at: string;
  };
}

export function AppointmentCard({ appointment }: AppointmentCardProps) {
  const statusColors = {
    scheduled: 'bg-blue-100 text-blue-800',
    completed: 'bg-green-100 text-green-800',
    cancelled: 'bg-red-100 text-red-800',
  };

  const isNew = new Date(appointment.created_at) > new Date(Date.now() - 5 * 60 * 1000);
  const isAIBooked = new Date(appointment.created_at) > new Date(Date.now() - 30 * 60 * 1000);

  return (
    <div className={`bg-slate-50 rounded-lg shadow-sm border border-slate-200 hover:shadow-md transition-shadow duration-200 ${
      isNew ? 'ring-2 ring-sky-500 ring-opacity-50' : ''
    }`}>
      <div className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-sky-100 rounded-full flex items-center justify-center">
              <User className="h-5 w-5 text-sky-600" />
            </div>
            <div>
              <h3 className="text-lg font-medium text-slate-800">{appointment.patient_name}</h3>
              <p className="text-sm text-slate-500 flex items-center">
                <Phone className="h-4 w-4 mr-1" />
                {appointment.phone_number}
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            {isNew && (
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-sky-100 text-sky-800">
                New
              </span>
            )}
            {isAIBooked && (
              <div className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">
                <img 
                  src="/logo_symbol.png" 
                  alt="AI" 
                  className="h-3 w-3 mr-1"
                />
                AI Booked
              </div>
            )}
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
              statusColors[appointment.status]
            }`}>
              {appointment.status.charAt(0).toUpperCase() + appointment.status.slice(1)}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
        </div>

        {appointment.notes && (
          <div className="mt-4 p-3 bg-slate-100 rounded-md">
            <p className="text-sm text-slate-700">{appointment.notes}</p>
          </div>
        )}
      </div>
    </div>
  );
}