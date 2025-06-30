import React, { useState } from 'react';
import { useAuth } from './auth/AuthProvider';
import { Copy, Check, RefreshCw } from 'lucide-react';

/**
 * A helper component that displays the current JWT token and provides a copy button
 * This is useful for debugging and testing JWT authentication
 */
export const JWTTokenHelper: React.FC = () => {
  const { session, getJwtToken } = useAuth();
  const [copied, setCopied] = useState(false);
  const [showToken, setShowToken] = useState(false);
  
  const token = getJwtToken();
  
  const copyToken = () => {
    if (token) {
      navigator.clipboard.writeText(token);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };
  
  if (!token) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-sm text-yellow-800">
        <p className="font-medium">No JWT token available</p>
        <p className="mt-1">You need to be logged in to get a JWT token.</p>
      </div>
    );
  }
  
  // Only show the first 10 characters and last 10 characters of the token
  const truncatedToken = showToken 
    ? token 
    : `${token.substring(0, 10)}...${token.substring(token.length - 10)}`;
  
  return (
    <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-medium text-slate-800">JWT Token</h3>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setShowToken(!showToken)}
            className="text-xs text-blue-600 hover:text-blue-800"
          >
            {showToken ? 'Hide' : 'Show Full Token'}
          </button>
          <button
            onClick={copyToken}
            className="p-1 hover:bg-slate-200 rounded transition-colors"
            title="Copy token"
          >
            {copied ? (
              <Check className="h-4 w-4 text-green-600" />
            ) : (
              <Copy className="h-4 w-4 text-slate-600" />
            )}
          </button>
        </div>
      </div>
      <div className="bg-slate-100 rounded p-2 overflow-x-auto">
        <code className="text-xs text-slate-800 break-all whitespace-pre-wrap">
          {truncatedToken}
        </code>
      </div>
      <div className="mt-2 text-xs text-slate-500">
        <p>Expires: {session?.expires_at ? new Date(session.expires_at * 1000).toLocaleString() : 'Unknown'}</p>
        <p className="mt-1">Use this token in the Authorization header as: <code className="bg-slate-100 px-1 py-0.5 rounded">Bearer {truncatedToken}</code></p>
      </div>
    </div>
  );
};

export default JWTTokenHelper;