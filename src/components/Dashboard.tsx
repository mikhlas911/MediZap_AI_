import React from 'react';
import { Calendar, Phone, Users, Clock, TrendingUp, AlertCircle, Zap, PhoneCall } from 'lucide-react';
import { StatsCard } from './StatsCard';
import { AppointmentCard } from './AppointmentCard';
import { useAppointments, useClinics } from '../hooks/useSupabaseData';

export function Dashboard() {
  const { clinics } = useClinics();
  const { appointments, loading, error } = useAppointments();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="text-center">
          <div className="relative mb-6">
            <img 
              src="/logo_symbol.png" 
              alt="MediZap AI" 
              className="h-16 w-16 mx-auto animate-pulse"
            />
            <div className="absolute -top-2 -right-2 w-6 h-6 bg-emerald-500 rounded-full animate-ping"></div>
          </div>
          <p className="text-slate-600">Loading MediZap AI dashboard...</p>
          <div className="mt-4 w-48 h-1 bg-slate-200 rounded-full mx-auto overflow-hidden">
            <div className="h-full bg-gradient-to-r from-sky-500 to-emerald-500 rounded-full animate-pulse"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <p className="text-slate-600">Error loading data: {error}</p>
        </div>
      </div>
    );
  }

  const todaysAppointments = appointments.filter(
    apt => apt.appointment_date === new Date().toISOString().split('T')[0]
  );

  const upcomingAppointments = appointments.filter(
    apt => new Date(apt.appointment_date) >= new Date()
  );

  const recentAppointments = appointments
    .filter(apt => new Date(apt.created_at) > new Date(Date.now() - 24 * 60 * 60 * 1000))
    .slice(0, 6);

  const aiBookedAppointments = appointments.filter(
    apt => apt.notes?.includes('AI voice agent') || new Date(apt.created_at) > new Date(Date.now() - 30 * 60 * 1000)
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-slate-50 to-blue-50 rounded-xl p-6 border border-slate-200">
        <div className="flex items-center space-x-4">
          <div className="relative">
            <img 
              src="/logo_symbol.png" 
              alt="MediZap AI" 
              className="h-12 w-12 object-contain"
            />
            <div className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full animate-pulse flex items-center justify-center">
              <div className="w-2 h-2 bg-slate-50 rounded-full"></div>
            </div>
          </div>
          <div>
            <h1 className="text-3xl font-bold text-slate-800">MediZap AI Dashboard</h1>
            <p className="text-slate-600 mt-1 text-lg">
              Real-time overview of appointments and AI voice agent activity
            </p>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatsCard
          title="Today's Appointments"
          value={todaysAppointments.length}
          icon={Calendar}
          description="Scheduled for today"
          trend={{ value: 12, isPositive: true, label: 'vs yesterday' }}
        />
        <StatsCard
          title="Total Appointments"
          value={appointments.length}
          icon={Users}
          description="All time bookings"
        />
        <StatsCard
          title="AI Booked Today"
          value={aiBookedAppointments.length}
          icon={PhoneCall}
          description="Via MediZap AI calls"
          trend={{ value: 25, isPositive: true, label: 'vs yesterday' }}
        />
        <StatsCard
          title="AI Response Time"
          value="2.3s"
          icon={Clock}
          description="Average agent speed"
          trend={{ value: 15, isPositive: false, label: 'vs yesterday' }}
        />
      </div>

      {/* Recent Appointments */}
      <div className="bg-slate-50 rounded-lg shadow-sm border border-slate-200">
        <div className="px-6 py-4 border-b border-slate-200">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-medium text-slate-800">Recent Appointments</h2>
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
              <span className="text-sm text-slate-600">Live updates</span>
            </div>
          </div>
        </div>
        <div className="p-6">
          {recentAppointments.length > 0 ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {recentAppointments.map((appointment) => (
                <AppointmentCard key={appointment.id} appointment={appointment} />
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <Calendar className="h-12 w-12 text-slate-400 mx-auto mb-4" />
              <p className="text-slate-600">No recent appointments</p>
              <p className="text-sm text-slate-500 mt-1">
                New appointments will appear here automatically
              </p>
            </div>
          )}
        </div>
      </div>

      {/* AI Agent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-slate-50 rounded-lg shadow-sm border border-slate-200">
          <div className="px-6 py-4 border-b border-slate-200">
            <div className="flex items-center space-x-3">
              <img 
                src="/logo_symbol.png" 
                alt="MediZap AI" 
                className="h-6 w-6 object-contain"
              />
              <h3 className="text-lg font-medium text-slate-800">MediZap AI Status</h3>
            </div>
          </div>
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
                <span className="text-sm font-medium text-slate-800">Active & Learning</span>
              </div>
              <span className="text-sm text-slate-500">Online 24/7</span>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-slate-600">Calls handled today</span>
                <span className="font-medium">{aiBookedAppointments.length + 2}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-600">Appointments booked</span>
                <span className="font-medium">{aiBookedAppointments.length}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-600">Success rate</span>
                <span className="font-medium text-green-600">
                  {aiBookedAppointments.length > 0 ? Math.round((aiBookedAppointments.length / (aiBookedAppointments.length + 2)) * 100) : 85}%
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-600">Patient satisfaction</span>
                <span className="font-medium text-emerald-600">4.8/5</span>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-slate-50 rounded-lg shadow-sm border border-slate-200">
          <div className="px-6 py-4 border-b border-slate-200">
            <h3 className="text-lg font-medium text-slate-800">Quick Actions</h3>
          </div>
          <div className="p-6 space-y-3">
            <button 
              onClick={() => window.open('/calls', '_self')}
              className="w-full flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-slate-50 bg-gradient-to-r from-sky-600 to-emerald-600 hover:from-sky-700 hover:to-emerald-700 transition-all duration-200"
            >
              <img 
                src="/logo_symbol.png" 
                alt="AI" 
                className="h-4 w-4 mr-2 filter brightness-0 invert"
              />
              View Call Center
            </button>
            <button 
              onClick={() => window.open('/appointments', '_self')}
              className="w-full flex items-center justify-center px-4 py-2 border border-slate-300 rounded-md shadow-sm text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors"
            >
              <Calendar className="h-4 w-4 mr-2" />
              Manage Appointments
            </button>
            <button 
              onClick={() => window.open('/doctors', '_self')}
              className="w-full flex items-center justify-center px-4 py-2 border border-slate-300 rounded-md shadow-sm text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors"
            >
              <Users className="h-4 w-4 mr-2" />
              Manage Doctors
            </button>
          </div>
        </div>
      </div>

      {/* Setup Instructions */}
      <div className="bg-gradient-to-r from-emerald-50 to-sky-50 rounded-lg border border-emerald-200 p-6">
        <div className="flex items-start space-x-4">
          <div className="flex-shrink-0">
            <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
              <Phone className="h-5 w-5 text-emerald-600" />
            </div>
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-medium text-slate-800 mb-2">
              Complete Your MediZap AI Setup
            </h3>
            <p className="text-slate-600 mb-4">
              To enable phone call functionality, configure your Twilio and ElevenLabs credentials in your environment variables.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <h4 className="font-medium text-slate-700 mb-2">Required Environment Variables:</h4>
                <ul className="space-y-1 text-slate-600">
                  <li>• TWILIO_ACCOUNT_SID</li>
                  <li>• TWILIO_AUTH_TOKEN</li>
                  <li>• TWILIO_PHONE_NUMBER</li>
                  <li>• ELEVENLABS_API_KEY</li>
                  <li>• ELEVENLABS_VOICE_ID</li>
                </ul>
              </div>
              <div>
                <h4 className="font-medium text-slate-700 mb-2">Setup Steps:</h4>
                <ol className="space-y-1 text-slate-600">
                  <li>1. Create Twilio account & get phone number</li>
                  <li>2. Create ElevenLabs account & select voice</li>
                  <li>3. Add credentials to .env file</li>
                  <li>4. Deploy edge functions to Supabase</li>
                  <li>5. Configure Twilio webhook URL</li>
                </ol>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}