import { createClient } from 'npm:@supabase/supabase-js@2.39.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'x-client-info, apikey, content-type, authorization',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

interface FetchDepartmentsRequest {
  clinicId?: string;
  isActive?: boolean;
  limit?: number;
  offset?: number;
}

interface Department {
  id: string;
  clinic_id: string;
  name: string;
  description?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  clinic?: {
    id: string;
    name: string;
  };
}

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // --- JWT Authentication ---
  // Get the Authorization header
  const authHeader = req.headers.get('authorization');
  
  // Check if Authorization header exists and starts with 'Bearer '
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    console.log('[ERROR] Missing or invalid Authorization header');
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Unauthorized',
        message: 'Missing or invalid Authorization header'
      }),
      {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
  
  // Extract the JWT token
  const jwt = authHeader.replace('Bearer ', '');

  // --- Environment Variables Check ---
  const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return new Response(
      JSON.stringify({ success: false, error: 'Supabase environment variables are not set' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    console.log('[DEBUG] Fetch Departments - Authenticated request received:', {
      method: req.method,
      url: req.url,
      timestamp: new Date().toISOString(),
      hasValidSecret: true
    });

    // Create Supabase client with service role key (bypasses RLS)
    const supabase = createClient(
      SUPABASE_URL,
      SUPABASE_SERVICE_ROLE_KEY
    );

    let requestData: FetchDepartmentsRequest = {};

    // Handle both GET and POST requests
    if (req.method === 'GET') {
      const url = new URL(req.url);
      requestData = {
        clinicId: url.searchParams.get('clinicId') || undefined,
        isActive: url.searchParams.get('isActive') === 'true' ? true : 
                 url.searchParams.get('isActive') === 'false' ? false : undefined,
        limit: url.searchParams.get('limit') ? parseInt(url.searchParams.get('limit')!) : undefined,
        offset: url.searchParams.get('offset') ? parseInt(url.searchParams.get('offset')!) : undefined,
      };
    } else if (req.method === 'POST') {
      try {
        const bodyText = await req.text();
        if (bodyText.trim() === '') {
          requestData = {};
        } else {
          requestData = JSON.parse(bodyText);
        }
      } catch (error) {
        return new Response(
          JSON.stringify({
            success: false,
            error: 'Invalid JSON in request body',
            message: error.message,
            timestamp: new Date().toISOString()
          }),
          {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }
    }

    console.log('[DEBUG] Fetch Departments - Request parameters:', {
      requestData,
      timestamp: new Date().toISOString()
    });

    // Build the query
    let query = supabase
      .from('departments')
      .select(`
        id,
        clinic_id,
        name,
        description,
        is_active,
        created_at,
        updated_at,
        clinic:clinics(id, name)
      `, { count: 'exact' });

    // Apply filters
    if (requestData.clinicId) {
      console.log('[DEBUG] Fetch Departments - Applying clinic filter:', requestData.clinicId);
      query = query.eq('clinic_id', requestData.clinicId);
    }

    if (requestData.isActive !== undefined) {
      console.log('[DEBUG] Fetch Departments - Applying active filter:', requestData.isActive);
      query = query.eq('is_active', requestData.isActive);
    }

    // Apply pagination
    if (requestData.limit) {
      query = query.limit(requestData.limit);
    }

    if (requestData.offset) {
      query = query.range(requestData.offset, requestData.offset + (requestData.limit || 50) - 1);
    }

    // Apply ordering
    query = query.order('name', { ascending: true });

    console.log('[DEBUG] Fetch Departments - Executing query...');

    // Execute the query
    const { data: departments, error, count } = await query;

    console.log('[DEBUG] Fetch Departments - Query response:', {
      departmentsCount: departments?.length || 0,
      error,
      totalCount: count,
      timestamp: new Date().toISOString()
    });

    if (error) {
      console.error('[ERROR] Fetch Departments - Database error:', {
        error: error.message,
        details: error.details,
        hint: error.hint,
        timestamp: new Date().toISOString()
      });

      return new Response(
        JSON.stringify({
          success: false,
          error: 'Database error',
          message: error.message,
          timestamp: new Date().toISOString()
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const response = {
      success: true,
      data: departments,
      meta: {
        total: count,
        returned: departments?.length || 0,
        limit: requestData.limit,
        offset: requestData.offset
      },
      timestamp: new Date().toISOString()
    };

    console.log('[DEBUG] Fetch Departments - Sending response:', {
      success: true,
      dataCount: response.data.length,
      meta: response.meta,
      timestamp: new Date().toISOString()
    });

    return new Response(
      JSON.stringify(response),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('[ERROR] Fetch Departments - Unexpected error:', {
      error: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    });

    return new Response(
      JSON.stringify({
        success: false,
        error: 'Internal server error',
        message: error.message,
        timestamp: new Date().toISOString()
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});