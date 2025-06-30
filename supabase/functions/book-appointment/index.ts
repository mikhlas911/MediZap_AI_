import { createClient } from 'npm:@supabase/supabase-js@2.39.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'x-client-info, apikey, content-type, authorization',
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

// Function to send confirmation email
async function sendConfirmationEmail(appointmentData: any) {
  try {
    // Skip if no email is provided
    if (!appointmentData.email) {
      console.log('[INFO] No email provided, skipping confirmation email');
      return { success: false, reason: 'no_email' };
    }

    console.log('[DEBUG] Preparing to send confirmation email to:', appointmentData.email);
    
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const emailEndpoint = `${SUPABASE_URL}/functions/v1/send-confirmation-email`;
    
    const emailData = {
      to: appointmentData.email,
      patientName: appointmentData.patient_name,
      appointmentDate: appointmentData.appointment_date,
      appointmentTime: appointmentData.appointment_time,
      doctorName: appointmentData.doctor?.name,
      departmentName: appointmentData.department?.name,
      clinicName: appointmentData.clinic?.name || 'MediZap AI Clinic',
      appointmentId: appointmentData.id
    };
    
    console.log('[DEBUG] Email data prepared:', {
      to: emailData.to,
      appointmentId: emailData.appointmentId,
      timestamp: new Date().toISOString()
    });

    // Get the secret for authentication
    const ELEVENLABS_FUNCTION_SECRET = Deno.env.get('ELEVENLABS_FUNCTION_SECRET');
    
    const response = await fetch(emailEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Elevenlabs-Secret': ELEVENLABS_FUNCTION_SECRET || ''
      },
      body: JSON.stringify(emailData)
    });

    const result = await response.json();
    
    if (!response.ok) {
      console.error('[ERROR] Failed to send confirmation email:', result);
      return { success: false, error: result.error || 'Unknown error' };
    }
    
    console.log('[DEBUG] Confirmation email sent successfully:', {
      emailId: result.data?.id,
      timestamp: new Date().toISOString()
    });
    
    return { success: true, data: result.data };
  } catch (error) {
    console.error('[ERROR] Error sending confirmation email:', {
      error: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    });
    
    return { success: false, error: error.message };
  }
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
    console.log('[DEBUG] Book Appointment - Authenticated request received:', {
      method: req.method,
      url: req.url,
      timestamp: new Date().toISOString()
    });

    // Create Supabase client with the JWT token
    const supabaseAdmin = createClient(
      SUPABASE_URL,
      SUPABASE_SERVICE_ROLE_KEY
    );
    
    // Create a client with the JWT token to get the user
    const supabaseAuth = createClient(
      SUPABASE_URL,
      SUPABASE_SERVICE_ROLE_KEY,
      {
        global: {
          headers: {
            Authorization: `Bearer ${jwt}`
          }
        }
      }
    );
    
    // Get the authenticated user
    const { data: { user }, error: userError } = await supabaseAuth.auth.getUser(jwt);
    
    if (userError || !user) {
      console.error('[ERROR] Invalid JWT token or user not found:', userError);
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Unauthorized',
          message: 'Invalid JWT token or user not found'
        }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }
    
    console.log('[DEBUG] Authenticated user:', {
      userId: user.id,
      email: user.email,
      timestamp: new Date().toISOString()
    });

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
    const { data: existingAppointments, error: checkError } = await supabaseAdmin
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
      notes: requestData.notes || 'Booked via AI voice agent',
      created_by: user.id // Set the authenticated user as the creator
    };

    console.log('[DEBUG] Creating appointment with data:', appointmentData);

    const { data: appointment, error: insertError } = await supabaseAdmin
      .from('appointments')
      .insert([appointmentData])
      .select(`*,
        *,
        doctor:doctors(id, name, specialization),
        department:departments(id, name),
        clinic:clinics(id, name)
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

    // Send confirmation email asynchronously
    if (appointment.email) {
      console.log('[DEBUG] Sending confirmation email for appointment:', appointment.id);

      // Get the SUPABASE_URL for the email function
      const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
      const emailEndpoint = `${SUPABASE_URL}/functions/v1/send-confirmation-email`;
      
      // Prepare email data
      const emailData = {
        to: appointment.email,
        patientName: appointment.patient_name,
        appointmentDate: appointment.appointment_date,
        appointmentTime: appointment.appointment_time,
        doctorName: appointment.doctor?.name,
        departmentName: appointment.department?.name,
        clinicName: appointment.clinic?.name || 'MediZap AI Clinic',
        appointmentId: appointment.id
      };
      
      // Call the email function with the JWT token
      fetch(emailEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${jwt}`
        },
        body: JSON.stringify(emailData)
      })
      .then(response => response.json())
      .then(result => {
        console.log('[INFO] Email function response:', result);
      })
      .catch(error => {
        console.warn('[WARN] Failed to send confirmation email:', error);
      });
    }

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
        notes: appointment.notes,
        emailSent: !!appointment.email // Indicate if an email should be sent
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