import React, { useState } from 'react';
import { Mail, ArrowLeft, CheckCircle, AlertCircle } from 'lucide-react';
import { useAuth } from './AuthProvider';

interface ForgotPasswordFormProps {
  onSwitchToLogin: () => void;
}

export function ForgotPasswordForm({ onSwitchToLogin }: ForgotPasswordFormProps) {
  const { resetPassword } = useAuth();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { error } = await resetPassword(email);
      if (error) throw error;
      setSuccess(true);
    } catch (err: any) {
      setError(err.message || 'Failed to send reset email');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="w-full max-w-md mx-auto text-center">
        <div className="bg-slate-50 rounded-xl shadow-lg p-8 border border-emerald-200">
          <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="h-8 w-8 text-emerald-600" />
          </div>
          <h2 className="text-2xl font-bold text-slate-800 mb-2">Check Your Email</h2>
          <p className="text-slate-600 mb-6">
            We've sent a password reset link to <strong>{email}</strong>. 
            Please check your email and follow the instructions to reset your password.
          </p>
          <button
            onClick={onSwitchToLogin}
            className="w-full px-4 py-3 bg-gradient-to-r from-sky-600 to-emerald-600 text-slate-50 rounded-lg hover:from-sky-700 hover:to-emerald-700 transition-all duration-200"
          >
            Back to Sign In
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="text-center mb-8 bg-white bg-opacity-90 p-6 rounded-xl shadow-lg">
        <div className="flex items-center justify-center space-x-3 mb-4">
          <img 
            src="/logo_symbol.png" 
            alt="MediZap AI" 
            className="h-12 w-12 object-contain"
          />
          <h1 className="text-3xl font-bold text-slate-800">MediZap AI</h1>
        </div>
        <h2 className="text-xl font-semibold text-slate-800 mb-2">Reset Your Password</h2>
        <p className="text-slate-600">Enter your email address and we'll send you a link to reset your password.</p>
      </div>

      <form onSubmit={handleSubmit} className="bg-white bg-opacity-95 rounded-xl shadow-lg p-8 border border-slate-200">
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center space-x-3 mb-6">
            <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        <div className="mb-6">
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
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="block w-full pl-10 pr-3 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-sky-500 transition-colors bg-slate-50"
              placeholder="Enter your email"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full flex items-center justify-center px-4 py-3 border border-transparent rounded-lg shadow-sm text-sm font-medium text-slate-50 bg-gradient-to-r from-sky-600 to-emerald-600 hover:from-sky-700 hover:to-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sky-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 mb-4"
        >
          {loading ? (
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-slate-50"></div>
          ) : (
            'Send Reset Link'
          )}
        </button>

        <button
          type="button"
          onClick={onSwitchToLogin}
          className="w-full flex items-center justify-center px-4 py-3 text-sm font-medium text-slate-700 hover:text-slate-800 transition-colors"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Sign In
        </button>
      </form>
    </div>
  );
}