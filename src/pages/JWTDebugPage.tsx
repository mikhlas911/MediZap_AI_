import React from 'react';
import { useAuth } from '../components/auth/AuthProvider';
import JWTTokenHelper from '../components/JWTTokenHelper';
import { ArrowLeft, Send, RefreshCw, CheckCircle, XCircle } from 'lucide-react';
import { Link } from 'react-router-dom';

/**
 * A debug page for testing JWT authentication with the Edge Functions
 */
export function JWTDebugPage() {
  const { user, getJwtToken } = useAuth();
  const [endpoint, setEndpoint] = React.useState('/functions/v1/get-departments');
  const [requestBody, setRequestBody] = React.useState(JSON.stringify({ clinicId: '' }, null, 2));
  const [response, setResponse] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState(false);
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);
    setResponse(null);
    
    try {
      const token = getJwtToken();
      
      if (!token) {
        throw new Error('No JWT token available. Please log in first.');
      }
      
      // Get the Supabase URL from environment variables
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      
      if (!supabaseUrl) {
        throw new Error('Supabase URL not found in environment variables.');
      }
      
      // Construct the full URL
      const url = `${supabaseUrl}${endpoint}`;
      
      // Parse the request body
      let parsedBody;
      try {
        parsedBody = JSON.parse(requestBody);
      } catch (parseError) {
        throw new Error(`Invalid JSON in request body: ${parseError.message}`);
      }
      
      // Make the request
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(parsedBody)
      });
      
      // Parse the response
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(`Request failed with status ${response.status}: ${data.error || data.message || 'Unknown error'}`);
      }
      
      setResponse(data);
      setSuccess(true);
    } catch (error) {
      console.error('Error testing JWT authentication:', error);
      setError(error.message || 'An unknown error occurred');
    } finally {
      setLoading(false);
    }
  };
  
  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full text-center">
          <div className="bg-white rounded-xl shadow-lg p-8">
            <XCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-slate-800 mb-2">Authentication Required</h2>
            <p className="text-slate-600 mb-6">You need to be logged in to test JWT authentication.</p>
            <Link
              to="/"
              className="inline-flex items-center px-4 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-700 transition-colors"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Go to Login
            </Link>
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <Link
            to="/"
            className="inline-flex items-center text-slate-600 hover:text-slate-800"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back to Dashboard
          </Link>
        </div>
        
        <div className="bg-white rounded-xl shadow-lg p-8 border border-slate-200 mb-8">
          <h1 className="text-2xl font-bold text-slate-800 mb-2">JWT Authentication Debug</h1>
          <p className="text-slate-600 mb-6">
            Test JWT authentication with your Supabase Edge Functions.
          </p>
          
          <JWTTokenHelper />
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="bg-white rounded-xl shadow-lg p-8 border border-slate-200">
            <h2 className="text-xl font-bold text-slate-800 mb-4">Test Request</h2>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Endpoint
                </label>
                <input
                  type="text"
                  value={endpoint}
                  onChange={(e) => setEndpoint(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="/functions/v1/your-function"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Request Body (JSON)
                </label>
                <textarea
                  value={requestBody}
                  onChange={(e) => setRequestBody(e.target.value)}
                  rows={10}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-sm"
                  placeholder='{"key": "value"}'
                />
              </div>
              
              <button
                type="submit"
                disabled={loading}
                className="w-full inline-flex items-center justify-center px-4 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Testing...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    Test JWT Authentication
                  </>
                )}
              </button>
            </form>
          </div>
          
          <div className="bg-white rounded-xl shadow-lg p-8 border border-slate-200">
            <h2 className="text-xl font-bold text-slate-800 mb-4">Response</h2>
            
            {loading && (
              <div className="flex items-center justify-center py-12">
                <RefreshCw className="h-8 w-8 text-blue-500 animate-spin" />
              </div>
            )}
            
            {error && !loading && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                <div className="flex items-start">
                  <XCircle className="h-5 w-5 text-red-500 mt-0.5 mr-2 flex-shrink-0" />
                  <div>
                    <h3 className="text-sm font-medium text-red-800">Error</h3>
                    <p className="mt-1 text-sm text-red-700">{error}</p>
                  </div>
                </div>
              </div>
            )}
            
            {success && response && !loading && (
              <div className="space-y-4">
                <div className="flex items-center text-green-700 mb-2">
                  <CheckCircle className="h-5 w-5 mr-2" />
                  <span className="font-medium">Request Successful</span>
                </div>
                
                <div className="bg-slate-50 rounded-lg p-4 overflow-auto max-h-96">
                  <pre className="text-sm text-slate-800 whitespace-pre-wrap break-all">
                    {JSON.stringify(response, null, 2)}
                  </pre>
                </div>
              </div>
            )}
            
            {!loading && !error && !response && (
              <div className="text-center py-12 text-slate-500">
                <p>Send a request to see the response here</p>
              </div>
            )}
          </div>
        </div>
        
        <div className="mt-8 bg-blue-50 rounded-lg p-6 border border-blue-200">
          <h2 className="text-lg font-medium text-slate-800 mb-2">How to Use JWT Authentication</h2>
          <div className="space-y-2 text-sm text-slate-700">
            <p>1. Log in to get a valid JWT token</p>
            <p>2. Include the token in the Authorization header as <code className="bg-blue-100 px-1 py-0.5 rounded">Bearer YOUR_TOKEN</code></p>
            <p>3. The Edge Function will verify the token and allow access if valid</p>
            <p>4. For ElevenLabs integration, pass the token as the <code className="bg-blue-100 px-1 py-0.5 rounded">jwtToken</code> dynamic variable</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default JWTDebugPage;