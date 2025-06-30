import { supabase } from '../lib/supabase';

/**
 * Helper function to get the current JWT token
 * @returns The current JWT token or null if not authenticated
 */
export const getJwtToken = async (): Promise<string | null> => {
  try {
    const { data: { session }, error } = await supabase.auth.getSession();
    
    if (error || !session) {
      console.error('Error getting JWT token:', error);
      return null;
    }
    
    return session.access_token || null;
  } catch (error) {
    console.error('Error getting JWT token:', error);
    return null;
  }
};

/**
 * Helper function to check if a JWT token is valid
 * @param token The JWT token to check
 * @returns True if the token is valid, false otherwise
 */
export const isValidJwtToken = async (token: string): Promise<boolean> => {
  try {
    const { data: { user }, error } = await supabase.auth.getUser(token);
    return !error && !!user;
  } catch (error) {
    console.error('Error validating JWT token:', error);
    return false;
  }
};

/**
 * Helper function to add JWT token to fetch headers
 * @param headers The headers object to add the token to
 * @returns The headers object with the token added
 */
export const addJwtToHeaders = async (headers: HeadersInit = {}): Promise<HeadersInit> => {
  const token = await getJwtToken();
  
  if (!token) {
    return headers;
  }
  
  return {
    ...headers,
    'Authorization': `Bearer ${token}`
  };
};

/**
 * Wrapper for fetch that automatically adds JWT token to headers
 * @param url The URL to fetch
 * @param options The fetch options
 * @returns The fetch response
 */
export const authenticatedFetch = async (url: string, options: RequestInit = {}): Promise<Response> => {
  const headers = await addJwtToHeaders(options.headers);
  
  return fetch(url, {
    ...options,
    headers
  });
};

/**
 * Helper function to get user info from JWT token
 * @param token The JWT token
 * @returns The user info or null if the token is invalid
 */
export const getUserFromToken = async (token: string): Promise<any | null> => {
  try {
    const { data: { user }, error } = await supabase.auth.getUser(token);
    
    if (error || !user) {
      console.error('Error getting user from token:', error);
      return null;
    }
    
    return user;
  } catch (error) {
    console.error('Error getting user from token:', error);
    return null;
  }
};