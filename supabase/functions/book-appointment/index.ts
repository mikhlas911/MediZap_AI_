import { createClient } from 'npm:@supabase/supabase-js@2.39.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-elevenlabs-secret',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

interface BookAppointmentRequest {
  clinicId: string;
  patientName: string;
  patientPhone: string;
  patientEmail?: string;
  doctorId: string;
  departmentId: string;
  appointmentDate: string;
  appointmentTime: string;
  notes?: string;
}

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Only allow POST
  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ success: false, error: 'Method Not Allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // --- Custom Secret Authentication ---
  const ELEVENLABS_FUNCTION_SECRET = Deno.env.get('ELEVENLABS_FUNCTION_SECRET');
  const providedSecret = req.headers.get('x-elevenlabs-secret');
  
  console.log('[DEBUG] Authentication check:', {
    hasSecret: !!ELEVENLABS_FUNCTION_SECRET,
    hasProvidedSecret: !!providedSecret,
    secretsMatch: ELEVENLABS_FUNCTION_SECRET && providedSecret && ELEVENLABS_FUNCTION_SECRET === providedSecret,
    timestamp: new Date().toISOString()
  });

  // Check if secret is configured and provided
  if (ELEVENLABS_FUNCTION_SECRET) {
    if (!providedSecret) {
      console.log('[ERROR] Missing X-Elevenlabs-Secret header');
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Unauthorized',
          message: 'Missing X-Elevenlabs-Secret header'
        }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    if (providedSecret !== ELEVENLABS_FUNCTION_SECRET) {
      console.log('[ERROR] Invalid X-Elevenlabs-Secret header');
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Unauthorized',
          message: 'Invalid X-Elevenlabs-Secret header'
        }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }
  } else {
    console.log('[WARN] ELEVENLABS_FUNCTION_SECRET not configured - allowing all requests');
  }

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
    console.log('[DEBUG] Book Appointment - Authenticated request received:', {
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

    // Parse request body
    let requestData: BookAppointmentRequest;
    try {
      const bodyText = await req.text();
      if (bodyText.trim() === '') {
        throw new Error('Request body is empty');
      }
      requestData = JSON.parse(bodyText);
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

    console.log('[DEBUG] Book Appointment - Request data:', {
      patientName: requestData.patientName,
      clinicId: requestData.clinicId,
      doctorId: requestData.doctorId,
      appointmentDate: requestData.appointmentDate,
      appointmentTime: requestData.appointmentTime,
      timestamp: new Date().toISOString()
    });

    // Validate required fields
    const requiredFields = ['clinicId', 'patientName', 'patientPhone', 'doctorId', 'departmentId', 'appointmentDate', 'appointmentTime'];
    const missingFields = requiredFields.filter(field => !requestData[field]);
    
    if (missingFields.length > 0) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Missing required fields',
          message: `Missing fields: ${missingFields.join(', ')}`,
          timestamp: new Date().toISOString()
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Check if the time slot is available
    const { data: existingAppointments, error: checkError } = await supabase
      .from('appointments')
      .select('id')
      .eq('doctor_id', requestData.doctorId)
      .eq('appointment_date', requestData.appointmentDate)
      .eq('appointment_time', requestData.appointmentTime)
      .in('status', ['pending', 'confirmed']);

    if (checkError) {
      console.error('[ERROR] Failed to check appointment availability:', checkError);
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Failed to check appointment availability',
          message: checkError.message,
          timestamp: new Date().toISOString()
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    if (existingAppointments && existingAppointments.length > 0) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Time slot not available',
          message: 'The selected time slot is already booked',
          timestamp: new Date().toISOString()
        }),
        {
          status: 409,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Create the appointment
    const appointmentData = {
      clinic_id: requestData.clinicId,
      patient_name: requestData.patientName,
      phone_number: requestData.patientPhone,
      email: requestData.patientEmail || null,
      doctor_id: requestData.doctorId,
      department_id: requestData.departmentId,
      appointment_date: requestData.appointmentDate,
      appointment_time: requestData.appointmentTime,
      status: 'pending',
      notes: requestData.notes || 'Booked via AI voice agent'
    };

    console.log('[DEBUG] Creating appointment with data:', appointmentData);

    const { data: appointment, error: insertError } = await supabase
      .from('appointments')
      .insert([appointmentData])
      .select(`
        *,
        doctor:doctors(name, specialization),
        department:departments(name)
      `)
      .single();

    if (insertError) {
      console.error('[ERROR] Failed to create appointment:', insertError);
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Failed to create appointment',
          message: insertError.message,
          code: insertError.code,
          timestamp: new Date().toISOString()
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    console.log('[DEBUG] Appointment created successfully:', {
      appointmentId: appointment.id,
      patientName: appointment.patient_name,
      timestamp: new Date().toISOString()
    });

    // Prepare response
    const response = {
      success: true,
      data: {
        appointmentId: appointment.id,
        patientName: appointment.patient_name,
        doctorName: appointment.doctor?.name,
        departmentName: appointment.department?.name,
        appointmentDate: appointment.appointment_date,
        appointmentTime: appointment.appointment_time,
        status: appointment.status,
        notes: appointment.notes
      },
      message: 'Appointment booked successfully',
      timestamp: new Date().toISOString()
    };

    return new Response(
      JSON.stringify(response),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('[ERROR] Book Appointment - Unexpected error:', {
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