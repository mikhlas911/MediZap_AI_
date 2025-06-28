import { createClient } from 'npm:@supabase/supabase-js@2.39.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

interface FetchDoctorsRequest {
  clinicId?: string;
  departmentId?: string;
  isActive?: boolean;
  includeAvailability?: boolean;
  limit?: number;
  offset?: number;
}

interface Doctor {
  id: string;
  clinic_id: string;
  department_id: string;
  name: string;
  specialization?: string;
  phone?: string;
  available_days: string[];
  available_times: string[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
  department?: {
    id: string;
    name: string;
    description?: string;
  };
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

  // --- Authorization Header Check ---
  const authHeader = req.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
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
  // --- End Authorization Header Check ---

  try {
    console.log('[DEBUG] Fetch Doctors - Request received:', {
      method: req.method,
      url: req.url,
      timestamp: new Date().toISOString()
    });

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    let requestData: FetchDoctorsRequest = {};

    // Handle both GET and POST requests
    if (req.method === 'GET') {
      const url = new URL(req.url);
      requestData = {
        clinicId: url.searchParams.get('clinicId') || undefined,
        departmentId: url.searchParams.get('departmentId') || undefined,
        isActive: url.searchParams.get('isActive') === 'true' ? true : 
                 url.searchParams.get('isActive') === 'false' ? false : undefined,
        includeAvailability: url.searchParams.get('includeAvailability') === 'true',
        limit: url.searchParams.get('limit') ? parseInt(url.searchParams.get('limit')!) : undefined,
        offset: url.searchParams.get('offset') ? parseInt(url.searchParams.get('offset')!) : undefined,
      };
    } else if (req.method === 'POST') {
      requestData = await req.json();
    }

    console.log('[DEBUG] Fetch Doctors - Request parameters:', {
      requestData,
      timestamp: new Date().toISOString()
    });

    // Build the query
    let query = supabase
      .from('doctors')
      .select(`
        id,
        clinic_id,
        department_id,
        name,
        specialization,
        phone,
        available_days,
        available_times,
        is_active,
        created_at,
        updated_at,
        department:departments(id, name, description),
        clinic:clinics(id, name)
      `, { count: 'exact' });

    // Apply filters
    if (requestData.clinicId) {
      console.log('[DEBUG] Fetch Doctors - Applying clinic filter:', requestData.clinicId);
      query = query.eq('clinic_id', requestData.clinicId);
    }

    if (requestData.departmentId) {
      console.log('[DEBUG] Fetch Doctors - Applying department filter:', requestData.departmentId);
      query = query.eq('department_id', requestData.departmentId);
    }

    if (requestData.isActive !== undefined) {
      console.log('[DEBUG] Fetch Doctors - Applying active filter:', requestData.isActive);
      query = query.eq('is_active', requestData.isActive);
    }

    // Apply pagination
    if (requestData.limit) {
      console.log('[DEBUG] Fetch Doctors - Applying limit:', requestData.limit);
      query = query.limit(requestData.limit);
    }

    if (requestData.offset) {
      console.log('[DEBUG] Fetch Doctors - Applying offset:', requestData.offset);
      query = query.range(requestData.offset, requestData.offset + (requestData.limit || 50) - 1);
    }

    // Apply ordering
    query = query.order('name', { ascending: true });

    console.log('[DEBUG] Fetch Doctors - Executing query...');

    // Execute the query
    const { data: doctors, error, count } = await query;

    console.log('[DEBUG] Fetch Doctors - Query response:', {
      doctorsCount: doctors?.length || 0,
      totalCount: count,
      error: error?.message || null,
      timestamp: new Date().toISOString()
    });

    if (error) {
      console.error('[ERROR] Fetch Doctors - Database error:', {
        error: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
        timestamp: new Date().toISOString()
      });

      return new Response(
        JSON.stringify({
          success: false,
          error: 'Database query failed',
          message: error.message,
          code: error.code
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Process the data
    const processedDoctors: Doctor[] = (doctors || []).map(doctor => ({
      ...doctor,
      // Ensure arrays are properly formatted
      available_days: Array.isArray(doctor.available_days) ? doctor.available_days : [],
      available_times: Array.isArray(doctor.available_times) ? doctor.available_times : [],
    }));

    // Filter out availability data if not requested
    if (!requestData.includeAvailability) {
      processedDoctors.forEach(doctor => {
        delete doctor.available_days;
        delete doctor.available_times;
      });
    }

    console.log('[DEBUG] Fetch Doctors - Processed data:', {
      processedCount: processedDoctors.length,
      sampleDoctor: processedDoctors[0] ? {
        id: processedDoctors[0].id,
        name: processedDoctors[0].name,
        specialization: processedDoctors[0].specialization,
        departmentName: processedDoctors[0].department?.name
      } : null,
      timestamp: new Date().toISOString()
    });

    // Prepare response
    const response = {
      success: true,
      data: processedDoctors,
      meta: {
        total: count || processedDoctors.length,
        count: processedDoctors.length,
        limit: requestData.limit || null,
        offset: requestData.offset || 0,
        hasMore: requestData.limit ? (requestData.offset || 0) + processedDoctors.length < (count || 0) : false
      },
      filters: {
        clinicId: requestData.clinicId || null,
        departmentId: requestData.departmentId || null,
        isActive: requestData.isActive !== undefined ? requestData.isActive : null,
        includeAvailability: requestData.includeAvailability || false
      },
      timestamp: new Date().toISOString()
    };

    console.log('[DEBUG] Fetch Doctors - Sending response:', {
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
    console.error('[ERROR] Fetch Doctors - Unexpected error:', {
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
