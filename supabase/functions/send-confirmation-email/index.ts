import { Resend } from 'npm:resend@2.0.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'x-client-info, apikey, content-type, authorization',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

interface EmailRequest {
  to: string;
  patientName: string;
  appointmentDate: string;
  appointmentTime: string;
  doctorName: string;
  departmentName: string;
  clinicName: string;
  appointmentId: string;
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
  const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
  if (!RESEND_API_KEY) {
    return new Response(
      JSON.stringify({ success: false, error: 'Resend API key is not set' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    console.log('[DEBUG] Send Confirmation Email - Request received:', {
      method: req.method,
      url: req.url,
      timestamp: new Date().toISOString()
    });

    // Parse request body
    let emailData: EmailRequest;
    try {
      const bodyText = await req.text();
      if (bodyText.trim() === '') {
        throw new Error('Request body is empty');
      }
      emailData = JSON.parse(bodyText);
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

    // Validate required fields
    const requiredFields = ['to', 'patientName', 'appointmentDate', 'appointmentTime', 'doctorName', 'departmentName', 'clinicName', 'appointmentId'];
    const missingFields = requiredFields.filter(field => !emailData[field]);
    
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

    // Format date for display
    const formattedDate = new Date(emailData.appointmentDate).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    // Format time for display
    const formattedTime = (() => {
      try {
        // Ensure the time format is valid for Date parsing
        const timeValue = emailData.appointmentTime.includes(':') 
          ? emailData.appointmentTime 
          : `${emailData.appointmentTime}:00`;
        
        return new Date(`2000-01-01T${timeValue}`).toLocaleTimeString('en-US', {
          hour: 'numeric',
          minute: '2-digit',
          hour12: true
        });
      } catch (err) {
        console.error('Error formatting time:', err, emailData.appointmentTime);
        return emailData.appointmentTime; // Fallback to original time format if parsing fails
      }
    })();

    // Initialize Resend client
    const resend = new Resend(RESEND_API_KEY);

    // Create HTML email content
    const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Appointment Confirmation</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          line-height: 1.6;
          color: #333;
          margin: 0;
          padding: 0;
        }
        .container {
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
        }
        .header {
          background: linear-gradient(to right, #0ea5e9, #10b981);
          color: white;
          padding: 20px;
          text-align: center;
          border-radius: 8px 8px 0 0;
        }
        .content {
          background-color: #f8fafc;
          padding: 20px;
          border-radius: 0 0 8px 8px;
          border: 1px solid #e2e8f0;
          border-top: none;
        }
        .appointment-details {
          background-color: white;
          padding: 15px;
          border-radius: 8px;
          margin: 20px 0;
          border: 1px solid #e2e8f0;
        }
        .footer {
          text-align: center;
          margin-top: 20px;
          font-size: 12px;
          color: #64748b;
        }
        h1 {
          margin: 0;
          font-size: 24px;
        }
        h2 {
          font-size: 18px;
          margin-top: 0;
          color: #0f172a;
        }
        p {
          margin: 10px 0;
        }
        .detail-row {
          display: flex;
          margin-bottom: 10px;
        }
        .detail-label {
          font-weight: bold;
          width: 140px;
          color: #64748b;
        }
        .detail-value {
          flex: 1;
          color: #0f172a;
        }
        .button {
          display: inline-block;
          background: linear-gradient(to right, #0ea5e9, #10b981);
          color: white;
          text-decoration: none;
          padding: 10px 20px;
          border-radius: 4px;
          margin-top: 15px;
          font-weight: bold;
        }
        .reference {
          background-color: #f1f5f9;
          padding: 10px;
          border-radius: 4px;
          font-family: monospace;
          text-align: center;
          margin: 15px 0;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Appointment Confirmation</h1>
        </div>
        <div class="content">
          <p>Dear ${emailData.patientName},</p>
          <p>Your appointment has been successfully booked with ${emailData.clinicName}. Here are your appointment details:</p>
          
          <div class="appointment-details">
            <h2>Appointment Information</h2>
            <div class="detail-row">
              <div class="detail-label">Date:</div>
              <div class="detail-value">${formattedDate}</div>
            </div>
            <div class="detail-row">
              <div class="detail-label">Time:</div>
              <div class="detail-value">${formattedTime}</div>
            </div>
            <div class="detail-row">
              <div class="detail-label">Doctor:</div>
              <div class="detail-value">Dr. ${emailData.doctorName}</div>
            </div>
            <div class="detail-row">
              <div class="detail-label">Department:</div>
              <div class="detail-value">${emailData.departmentName}</div>
            </div>
            <div class="detail-row">
              <div class="detail-label">Clinic:</div>
              <div class="detail-value">${emailData.clinicName}</div>
            </div>
          </div>
          
          <p>Your appointment reference number is:</p>
          <div class="reference">${emailData.appointmentId}</div>
          
          <p>Please arrive 15 minutes before your scheduled appointment time. If you need to reschedule or cancel your appointment, please contact us at least 24 hours in advance.</p>
          
          <p>Thank you for choosing ${emailData.clinicName} for your healthcare needs.</p>
          
          <p>Best regards,<br>MediZap AI Team</p>
        </div>
        <div class="footer">
          <p>This is an automated message. Please do not reply to this email.</p>
          <p>© ${new Date().getFullYear()} MediZap AI. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
    `;

    // Send email using Resend
    console.log('[DEBUG] Sending email to:', emailData.to);
    
    const { data, error } = await resend.emails.send({
      from: 'MediZap AI <appointments@resend.dev>', // Use your verified domain in production
      to: emailData.to,
      subject: `Appointment Confirmation - ${emailData.clinicName}`,
      html: htmlContent,
    });

    if (error) {
      console.error('[ERROR] Failed to send email:', error);
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Failed to send email',
          message: error.message,
          timestamp: new Date().toISOString()
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    console.log('[DEBUG] Email sent successfully:', {
      id: data?.id,
      to: emailData.to,
      timestamp: new Date().toISOString()
    });

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          id: data?.id,
          to: emailData.to
        },
        message: 'Email sent successfully',
        timestamp: new Date().toISOString()
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('[ERROR] Send Confirmation Email - Unexpected error:', {
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