import React, { useState } from 'react';
import { Eye, EyeOff, Mail, Lock, AlertCircle, UserPlus } from 'lucide-react';
import { useAuth } from './AuthProvider';

interface LoginFormProps {
  onSwitchToRegister: () => void;
  onSwitchToGuestSignup: () => void;
  onSwitchToForgotPassword: () => void;
}

export function LoginForm({ onSwitchToRegister, onSwitchToGuestSignup, onSwitchToForgotPassword }: LoginFormProps) {
  const { signIn } = useAuth();
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { error } = await signIn(formData.email, formData.password);
      if (error) throw error;
    } catch (err: any) {
      // Provide more helpful error messages
      let errorMessage = err.message || 'Failed to sign in';
      
      if (err.message?.includes('Invalid login credentials') || err.message?.includes('invalid_credentials')) {
        errorMessage = 'The email or password you entered is incorrect. Please check your credentials and try again.';
      } else if (err.message?.includes('Email not confirmed')) {
        errorMessage = 'Please check your email and click the confirmation link before signing in.';
      } else if (err.message?.includes('Too many requests')) {
        errorMessage = 'Too many login attempts. Please wait a few minutes before trying again.';
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
    // Clear error when user starts typing
    if (error) {
      setError(null);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="text-center mb-8">
        <div className="flex items-center justify-center space-x-3 mb-4">
          <img 
            src="/logo_symbol.png" 
            alt="MediZap AI" 
            className="h-12 w-12 object-contain"
          />
          <h1 className="text-3xl font-bold text-slate-800">MediZap AI</h1>
        </div>
        <p className="text-slate-600">Sign in to your account</p>
      </div>

      <div className="bg-slate-50 rounded-xl shadow-lg p-8 border border-slate-200">
        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-start space-x-3">
                <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm text-red-700 mb-2">{error}</p>
                  {error.includes('email or password you entered is incorrect') && (
                    <div className="text-xs text-red-600 space-y-1">
                      <p>• Make sure your email address is spelled correctly</p>
                      <p>• Check that Caps Lock is not enabled</p>
                      <p>• Try using the "Forgot your password?" link below</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-2">
              Email Address
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Mail className="h-5 w-5 text-slate-400" />
              </div>
              <input
                id="email"
                name="email"
                type="email"
                required
                value={formData.email}
                onChange={handleChange}
                className="block w-full pl-10 pr-3 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-sky-500 transition-colors bg-slate-50"
                placeholder="Enter your email"
              />
            </div>
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-slate-700 mb-2">
              Password
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Lock className="h-5 w-5 text-slate-400" />
              </div>
              <input
                id="password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                required
                value={formData.password}
                onChange={handleChange}
                className="block w-full pl-10 pr-10 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-sky-500 transition-colors bg-slate-50"
                placeholder="Enter your password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center"
              >
                {showPassword ? (
                  <EyeOff className="h-5 w-5 text-slate-400 hover:text-slate-600" />
                ) : (
                  <Eye className="h-5 w-5 text-slate-400 hover:text-slate-600" />
                )}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center px-4 py-3 border border-transparent rounded-lg shadow-sm text-sm font-medium text-slate-50 bg-gradient-to-r from-sky-600 to-emerald-600 hover:from-sky-700 hover:to-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sky-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
          >
            {loading ? (
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-slate-50"></div>
            ) : (
              'Sign In'
            )}
          </button>

          <div className="text-center space-y-3">
            <button
              type="button"
              onClick={onSwitchToForgotPassword}
              className="text-sm text-sky-600 hover:text-sky-700 transition-colors"
            >
              Forgot your password?
            </button>
            
            <div className="border-t border-slate-200 pt-3">
              <div className="text-sm text-slate-600 space-y-2">
                <div>
                  <span>Healthcare provider? </span>
                  <button
                    type="button"
                    onClick={onSwitchToRegister}
                    className="text-sky-600 hover:text-sky-700 font-medium transition-colors"
                  >
                    Register your clinic
                  </button>
                </div>
                <div>
                  <span>Patient? </span>
                  <button
                    type="button"
                    onClick={onSwitchToGuestSignup}
                    className="text-emerald-600 hover:text-emerald-700 font-medium transition-colors inline-flex items-center"
                  >
                    <UserPlus className="h-4 w-4 mr-1" />
                    Create patient account
                  </button>
                </div>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}