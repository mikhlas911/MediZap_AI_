import React, { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './components/auth/AuthProvider';
import { AuthPage } from './components/auth/AuthPage';
import { CreateClinicForm } from './components/CreateClinicForm';
import { Layout } from './components/Layout';
import { Dashboard } from './components/Dashboard';
import { AppointmentsPage } from './pages/AppointmentsPage';
import { DoctorsPage } from './pages/DoctorsPage';
import { CallCenterPage } from './pages/CallCenterPage';
import { useClinicContext } from './hooks/useClinicContext';
import { supabase } from './lib/supabase';

function AppContent() {
  const { user, loading: authLoading, signOut } = useAuth();
  const { clinicId, loading: clinicLoading, error: clinicError } = useClinicContext();
  const [isConnected, setIsConnected] = useState(false);
  const [connectionLoading, setConnectionLoading] = useState(true);
  const [showCreateClinicForm, setShowCreateClinicForm] = useState(false);

  useEffect(() => {
    checkSupabaseConnection();
  }, []);

  const checkSupabaseConnection = async () => {
    try {
      const { data, error } = await supabase.from('clinics').select('count').limit(1);
      if (error) throw error;
      setIsConnected(true);
    } catch (error) {
      console.error('Supabase connection error:', error);
      setIsConnected(false);
    } finally {
      setConnectionLoading(false);
    }
  };

  const handleClinicCreated = () => {
    // Reload the page to refresh the clinic context
    window.location.reload();
  };

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  // Show loading screen while checking connection
  if (connectionLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="relative mb-6">
            <img 
              src="/logo_symbol.png" 
              alt="MediZap AI" 
              className="h-20 w-20 mx-auto animate-pulse"
            />
            <div className="absolute -top-2 -right-2 w-8 h-8 bg-emerald-500 rounded-full animate-ping flex items-center justify-center">
              <div className="w-4 h-4 bg-slate-50 rounded-full"></div>
            </div>
          </div>
          <h2 className="text-2xl font-bold text-slate-800 mb-2">MediZap AI</h2>
          <p className="text-slate-600 mb-4">Connecting to clinic database...</p>
          <div className="w-64 h-2 bg-slate-200 rounded-full mx-auto overflow-hidden">
            <div className="h-full bg-gradient-to-r from-sky-500 to-emerald-500 rounded-full animate-pulse"></div>
          </div>
        </div>
      </div>
    );
  }

  // Show connection error if Supabase is not connected
  if (!isConnected) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
        <div className="max-w-md mx-auto text-center">
          <div className="bg-slate-50 rounded-xl shadow-lg p-8 border border-slate-200">
            <div className="relative mb-6">
              <div className="w-24 h-24 bg-gradient-to-br from-red-100 to-red-200 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-12 h-12 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <div className="flex items-center justify-center space-x-3 mb-4">
                <img 
                  src="/logo_symbol.png" 
                  alt="MediZap AI" 
                  className="h-8 w-8 object-contain"
                />
                <span className="text-xl font-bold text-slate-800">MediZap AI</span>
              </div>
            </div>
            <h2 className="text-2xl font-bold text-slate-800 mb-3">Database Connection Required</h2>
            <p className="text-slate-600 mb-6 leading-relaxed">
              To use MediZap AI, you need to connect to Supabase first. This will enable all the AI-powered features and real-time capabilities.
            </p>
            <button
              onClick={() => window.open('https://bolt.new/setup/supabase', '_blank')}
              className="inline-flex items-center px-6 py-3 border border-transparent text-sm font-medium rounded-lg text-slate-50 bg-gradient-to-r from-sky-600 to-emerald-600 hover:from-sky-700 hover:to-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sky-500 transition-all duration-200 shadow-lg hover:shadow-xl"
            >
              <img 
                src="/logo_symbol.png" 
                alt="AI" 
                className="h-4 w-4 mr-2 filter brightness-0 invert"
              />
              Connect to Supabase
            </button>
            <p className="text-sm text-slate-500 mt-4">
              After connecting, refresh this page to continue with MediZap AI.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Show loading while checking authentication
  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="relative mb-6">
            <img 
              src="/logo_symbol.png" 
              alt="MediZap AI" 
              className="h-16 w-16 mx-auto animate-pulse"
            />
            <div className="absolute -top-2 -right-2 w-6 h-6 bg-emerald-500 rounded-full animate-ping"></div>
          </div>
          <p className="text-slate-600">Loading MediZap AI...</p>
        </div>
      </div>
    );
  }

  // Show auth page if user is not logged in
  if (!user) {
    return <AuthPage />;
  }

  // Show loading while checking clinic context
  if (clinicLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="relative mb-6">
            <img 
              src="/logo_symbol.png" 
              alt="MediZap AI" 
              className="h-16 w-16 mx-auto animate-pulse"
            />
            <div className="absolute -top-2 -right-2 w-6 h-6 bg-emerald-500 rounded-full animate-ping"></div>
          </div>
          <p className="text-slate-600">Loading clinic information...</p>
        </div>
      </div>
    );
  }

  // Show error if clinic context failed to load
  if (clinicError) {
    // Show create clinic form if user chose to register a new clinic
    if (showCreateClinicForm) {
      return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
          <CreateClinicForm
            userId={user.id}
            onClinicCreated={handleClinicCreated}
            onCancel={() => setShowCreateClinicForm(false)}
          />
        </div>
      );
    }

    // Show clinic access required message with option to create clinic
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
        <div className="max-w-md mx-auto text-center">
          <div className="bg-slate-50 rounded-xl shadow-lg p-8 border border-slate-200">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-slate-800 mb-2">Clinic Access Required</h2>
            <p className="text-slate-600 mb-6">
              {clinicError === 'No clinic association found' 
                ? 'Your account is not associated with any clinic. You can register a new clinic or contact your clinic administrator to get access.'
                : `Error: ${clinicError}`
              }
            </p>
            <div className="space-y-3">
              {clinicError === 'No clinic association found' && (
                <button
                  onClick={() => setShowCreateClinicForm(true)}
                  className="w-full px-4 py-3 bg-gradient-to-r from-sky-600 to-emerald-600 text-slate-50 rounded-lg hover:from-sky-700 hover:to-emerald-700 transition-all duration-200 font-medium"
                >
                  Register a New Clinic
                </button>
              )}
              <button
                onClick={() => window.location.reload()}
                className="w-full px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-100 transition-colors"
              >
                Retry
              </button>
              <button
                onClick={handleSignOut}
                className="w-full px-4 py-2 border border-red-300 text-red-700 rounded-lg hover:bg-red-50 transition-colors"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Show main app with routing if user is authenticated and has clinic access
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout><Dashboard /></Layout>} />
        <Route path="/appointments" element={<Layout><AppointmentsPage /></Layout>} />
        <Route path="/doctors" element={<Layout><DoctorsPage /></Layout>} />
        <Route path="/calls" element={<Layout><CallCenterPage /></Layout>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;