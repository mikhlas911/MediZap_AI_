import React, { useState, useEffect } from 'react';
import { Phone, Clock, Users, TrendingUp, PhoneCall, MessageSquare, Calendar, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { useClinicContext } from '../hooks/useClinicContext';
import { supabase } from '../lib/supabase';
import { format } from 'date-fns';

interface CallLog {
  id: string;
  call_sid: string;
  caller_phone: string;
  call_duration: number;
  call_summary: string;
  appointment_booked: boolean;
  created_at: string;
}

interface ConversationLog {
  id: string;
  call_sid: string;
  caller_phone: string;
  conversation_step: string;
  user_input: string;
  agent_response: string;
  created_at: string;
}

interface CallStats {
  totalCalls: number;
  appointmentsBooked: number;
  averageDuration: number;
  successRate: number;
  callsToday: number;
}

export function CallCenterPage() {
  const { clinicId } = useClinicContext();
  const [callLogs, setCallLogs] = useState<CallLog[]>([]);
  const [conversationLogs, setConversationLogs] = useState<ConversationLog[]>([]);
  const [selectedCallSid, setSelectedCallSid] = useState<string | null>(null);
  const [stats, setStats] = useState<CallStats>({
    totalCalls: 0,
    appointmentsBooked: 0,
    averageDuration: 0,
    successRate: 0,
    callsToday: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (clinicId) {
      fetchCallData();
      
      // Set up real-time subscription for call logs
      const callLogsSubscription = supabase
        .channel('call_logs')
        .on('postgres_changes', 
          { 
            event: '*', 
            schema: 'public', 
            table: 'call_logs',
            filter: `clinic_id=eq.${clinicId}`
          },
          () => {
            fetchCallData();
          }
        )
        .subscribe();

      return () => {
        callLogsSubscription.unsubscribe();
      };
    }
  }, [clinicId]);

  const fetchCallData = async () => {
    if (!clinicId) return;

    try {
      setLoading(true);
      
      // Fetch call logs
      const { data: callLogsData, error: callLogsError } = await supabase
        .from('call_logs')
        .select('*')
        .eq('clinic_id', clinicId)
        .order('created_at', { ascending: false })
        .limit(50);

      if (callLogsError) throw callLogsError;

      setCallLogs(callLogsData || []);

      // Calculate stats
      const today = new Date().toISOString().split('T')[0];
      const todaysCalls = callLogsData?.filter(call => 
        call.created_at.startsWith(today)
      ) || [];

      const appointmentsBooked = callLogsData?.filter(call => call.appointment_booked).length || 0;
      const totalDuration = callLogsData?.reduce((sum, call) => sum + call.call_duration, 0) || 0;
      const averageDuration = callLogsData?.length ? Math.round(totalDuration / callLogsData.length) : 0;
      const successRate = callLogsData?.length ? Math.round((appointmentsBooked / callLogsData.length) * 100) : 0;

      setStats({
        totalCalls: callLogsData?.length || 0,
        appointmentsBooked,
        averageDuration,
        successRate,
        callsToday: todaysCalls.length
      });

    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchConversationLogs = async (callSid: string) => {
    try {
      const { data, error } = await supabase
        .from('conversation_logs')
        .select('*')
        .eq('call_sid', callSid)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setConversationLogs(data || []);
    } catch (err: any) {
      console.error('Error fetching conversation logs:', err);
    }
  };

  const handleCallSelect = (callSid: string) => {
    setSelectedCallSid(callSid);
    fetchConversationLogs(callSid);
  };

  const formatDuration = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const formatPhoneNumber = (phone: string): string => {
    // Format phone number for display
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length === 11 && cleaned.startsWith('1')) {
      const number = cleaned.slice(1);
      return `+1 (${number.slice(0, 3)}) ${number.slice(3, 6)}-${number.slice(6)}`;
    }
    return phone;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="text-center">
          <Phone className="h-16 w-16 mx-auto text-slate-400 animate-pulse mb-4" />
          <p className="text-slate-600">Loading call center data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <p className="text-slate-600">Error loading call data: {error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-slate-50 to-blue-50 rounded-xl p-6 border border-slate-200">
        <div className="flex items-center space-x-4">
          <div className="relative">
            <div className="w-12 h-12 bg-emerald-100 rounded-lg flex items-center justify-center">
              <Phone className="h-6 w-6 text-emerald-600" />
            </div>
            <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full animate-pulse"></div>
          </div>
          <div>
            <h1 className="text-3xl font-bold text-slate-800">MediZap AI Call Center</h1>
            <p className="text-slate-600 mt-1">Monitor AI voice agent performance and call analytics</p>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        <div className="bg-slate-50 rounded-lg shadow-sm border border-slate-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-600">Calls Today</p>
              <p className="text-2xl font-semibold text-slate-800 mt-1">{stats.callsToday}</p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <PhoneCall className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-slate-50 rounded-lg shadow-sm border border-slate-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-600">Total Calls</p>
              <p className="text-2xl font-semibold text-slate-800 mt-1">{stats.totalCalls}</p>
            </div>
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <Phone className="h-6 w-6 text-purple-600" />
            </div>
          </div>
        </div>

        <div className="bg-slate-50 rounded-lg shadow-sm border border-slate-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-600">Appointments Booked</p>
              <p className="text-2xl font-semibold text-slate-800 mt-1">{stats.appointmentsBooked}</p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <Calendar className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-slate-50 rounded-lg shadow-sm border border-slate-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-600">Success Rate</p>
              <p className="text-2xl font-semibold text-slate-800 mt-1">{stats.successRate}%</p>
            </div>
            <div className="w-12 h-12 bg-emerald-100 rounded-lg flex items-center justify-center">
              <TrendingUp className="h-6 w-6 text-emerald-600" />
            </div>
          </div>
        </div>

        <div className="bg-slate-50 rounded-lg shadow-sm border border-slate-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-600">Avg Duration</p>
              <p className="text-2xl font-semibold text-slate-800 mt-1">{formatDuration(stats.averageDuration)}</p>
            </div>
            <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
              <Clock className="h-6 w-6 text-orange-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Call Logs and Conversation Details */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Call Logs */}
        <div className="bg-slate-50 rounded-lg shadow-sm border border-slate-200">
          <div className="px-6 py-4 border-b border-slate-200">
            <h2 className="text-lg font-medium text-slate-800">Recent Calls</h2>
          </div>
          <div className="p-6">
            {callLogs.length > 0 ? (
              <div className="space-y-4 max-h-96 overflow-y-auto">
                {callLogs.map((call) => (
                  <div
                    key={call.id}
                    onClick={() => handleCallSelect(call.call_sid)}
                    className={`p-4 rounded-lg border cursor-pointer transition-all duration-200 ${
                      selectedCallSid === call.call_sid
                        ? 'border-emerald-300 bg-emerald-50'
                        : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-3">
                        <div className={`w-3 h-3 rounded-full ${
                          call.appointment_booked ? 'bg-green-500' : 'bg-orange-500'
                        }`}></div>
                        <span className="font-medium text-slate-800">
                          {formatPhoneNumber(call.caller_phone)}
                        </span>
                      </div>
                      <div className="flex items-center space-x-2">
                        {call.appointment_booked ? (
                          <CheckCircle className="h-4 w-4 text-green-600" />
                        ) : (
                          <XCircle className="h-4 w-4 text-orange-600" />
                        )}
                        <span className="text-sm text-slate-500">
                          {formatDuration(call.call_duration)}
                        </span>
                      </div>
                    </div>
                    <div className="text-sm text-slate-600 mb-2">
                      {call.call_summary || 'No summary available'}
                    </div>
                    <div className="text-xs text-slate-500">
                      {format(new Date(call.created_at), 'MMM d, yyyy h:mm a')}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <Phone className="h-12 w-12 text-slate-400 mx-auto mb-4" />
                <p className="text-slate-600">No calls yet</p>
                <p className="text-sm text-slate-500 mt-1">
                  Call logs will appear here when patients call your AI agent
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Conversation Details */}
        <div className="bg-slate-50 rounded-lg shadow-sm border border-slate-200">
          <div className="px-6 py-4 border-b border-slate-200">
            <h2 className="text-lg font-medium text-slate-800">
              {selectedCallSid ? 'Conversation Details' : 'Select a Call'}
            </h2>
          </div>
          <div className="p-6">
            {selectedCallSid ? (
              conversationLogs.length > 0 ? (
                <div className="space-y-4 max-h-96 overflow-y-auto">
                  {conversationLogs.map((log, index) => (
                    <div key={log.id} className="space-y-2">
                      {log.user_input && (
                        <div className="flex justify-end">
                          <div className="bg-blue-100 rounded-lg p-3 max-w-xs">
                            <div className="text-xs text-blue-600 mb-1">Caller</div>
                            <div className="text-sm text-slate-800">{log.user_input}</div>
                          </div>
                        </div>
                      )}
                      {log.agent_response && (
                        <div className="flex justify-start">
                          <div className="bg-emerald-100 rounded-lg p-3 max-w-xs">
                            <div className="text-xs text-emerald-600 mb-1 flex items-center">
                              <img 
                                src="/logo_symbol.png" 
                                alt="AI" 
                                className="h-3 w-3 mr-1"
                              />
                              MediZap AI
                            </div>
                            <div className="text-sm text-slate-800">{log.agent_response}</div>
                          </div>
                        </div>
                      )}
                      <div className="text-xs text-slate-500 text-center">
                        {log.conversation_step} • {format(new Date(log.created_at), 'h:mm:ss a')}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <MessageSquare className="h-12 w-12 text-slate-400 mx-auto mb-4" />
                  <p className="text-slate-600">No conversation details available</p>
                </div>
              )
            ) : (
              <div className="text-center py-12">
                <MessageSquare className="h-12 w-12 text-slate-400 mx-auto mb-4" />
                <p className="text-slate-600">Select a call to view conversation details</p>
                <p className="text-sm text-slate-500 mt-1">
                  Click on any call from the list to see the full conversation
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* AI Agent Status */}
      <div className="bg-slate-50 rounded-lg shadow-sm border border-slate-200">
        <div className="px-6 py-4 border-b border-slate-200">
          <h2 className="text-lg font-medium text-slate-800">MediZap AI Agent Status</h2>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <div className="w-8 h-8 bg-green-500 rounded-full animate-pulse"></div>
              </div>
              <h3 className="font-medium text-slate-800 mb-1">Agent Status</h3>
              <p className="text-sm text-green-600">Online & Active</p>
            </div>
            
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <TrendingUp className="h-8 w-8 text-blue-600" />
              </div>
              <h3 className="font-medium text-slate-800 mb-1">Performance</h3>
              <p className="text-sm text-slate-600">Excellent (4.8/5)</p>
            </div>
            
            <div className="text-center">
              <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <Clock className="h-8 w-8 text-purple-600" />
              </div>
              <h3 className="font-medium text-slate-800 mb-1">Response Time</h3>
              <p className="text-sm text-slate-600">2.3 seconds avg</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}