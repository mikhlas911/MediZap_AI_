import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Phone, Calendar, Users, BarChart3, LogOut, Settings, UserCheck, Key } from 'lucide-react';
import { useAuth } from './auth/AuthProvider';
import { useClinicContext } from '../hooks/useClinicContext';

interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const { signOut, user } = useAuth();
  const { clinicName, userRole } = useClinicContext();
  const location = useLocation();

  const navigation = [
    { name: 'Dashboard', href: '/', icon: BarChart3, current: location.pathname === '/' },
    { name: 'Appointments', href: '/appointments', icon: Calendar, current: location.pathname === '/appointments' },
    { name: 'Doctors', href: '/doctors', icon: Users, current: location.pathname === '/doctors' },
    { name: 'Walk-Ins', href: '/walkins', icon: UserCheck, current: location.pathname === '/walkins' },
    { name: 'JWT Debug', href: '/jwt-debug', icon: Key, current: location.pathname === '/jwt-debug' },
    { name: 'Call Center', href: '/calls', icon: Phone, current: location.pathname === '/calls' },
  ];

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100">
      {/* Navigation */}
      <nav className="bg-slate-50 shadow-sm border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex">
              <div className="flex-shrink-0 flex items-center">
                <div className="relative flex items-center space-x-3">
                  <img 
                    src="/logo_symbol.png" 
                    alt="MediZap AI" 
                    className="h-10 w-10 object-contain"
                  />
                  <div>
                    <span className="text-xl font-bold text-slate-800">MediZap AI</span>
                    <div className="flex items-center space-x-1">
                      <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
                      <span className="text-xs text-slate-500">AI Active</span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
                {navigation.map((item) => (
                  <Link
                    key={item.name}
                    to={item.href}
                    className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium transition-colors duration-200 ${
                      item.current
                        ? 'border-sky-500 text-slate-800'
                        : 'border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700'
                    }`}
                  >
                    <item.icon className="h-4 w-4 mr-2" />
                    {item.name}
                  </Link>
                ))}
              </div>
            </div>
            <div className="flex items-center space-x-4">
              {/* Clinic Info */}
              {clinicName && (
                <div className="hidden md:flex items-center space-x-2 px-3 py-1 bg-sky-50 rounded-lg border border-sky-100">
                  <div className="text-sm">
                    <div className="font-medium text-slate-800">{clinicName}</div>
                    <div className="text-xs text-slate-500 capitalize">{userRole}</div>
                  </div>
                </div>
              )}
              
              {/* User Menu */}
              <div className="flex items-center space-x-2">
                <div className="text-sm text-slate-700">
                  {user?.user_metadata?.full_name || user?.email}
                </div>
                <button
                  onClick={handleSignOut}
                  className="inline-flex items-center px-3 py-2 border border-slate-300 rounded-md text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors"
                >
                  <LogOut className="h-4 w-4 mr-1" />
                  Sign Out
                </button>
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* Main content */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {children}
        </div>
      </main>
    </div>
  );
}