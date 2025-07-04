import { createClient } from 'npm:@supabase/supabase-js@2.39.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface CallSession {
  conversationState?: any;
  startTime?: string;
  language?: string;
}

// In-memory session storage (in production, use Redis or database)
const callSessions = new Map<string, CallSession>();

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const formData = await req.formData();
    const callSid = formData.get('CallSid') as string;
    const from = formData.get('From') as string;
    const to = formData.get('To') as string;
    const speechResult = formData.get('SpeechResult') as string;
    const confidence = formData.get('Confidence') as string;
    const callStatus = formData.get('CallStatus') as string;
    const recordingUrl = formData.get('RecordingUrl') as string;

    console.log('Twilio webhook received:', {
      callSid,
      from,
      to,
      speechResult,
      confidence,
      callStatus,
      recordingUrl
    });

    // Handle call status updates
    if (callStatus === 'completed') {
      await handleCallCompleted(supabase, callSid, from);
      return new Response('OK', { headers: corsHeaders });
    }

    // Get or create call session
    let session = callSessions.get(callSid) || {};
    if (!session.startTime) {
      session.startTime = new Date().toISOString();
      session.language = 'en'; // Default language, can be detected or set per clinic
      callSessions.set(callSid, session);
    }

    // Get clinic information based on the called number
    const { data: clinic, error: clinicError } = await supabase
      .from('clinics')
      .select('id, name, phone')
      .eq('phone', to)
      .single();

    if (clinicError || !clinic) {
      console.error('Clinic not found for number:', to, clinicError);
      return new Response(
        generateTwiML("I'm sorry, but this number is not configured for a clinic. Please check the number and try again.", true),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/xml' },
        }
      );
    }

    let userInput = speechResult || '';

    // If we have a recording URL but no speech result, transcribe using Whisper
    if (recordingUrl && !speechResult) {
      try {
        // Download the recording
        const recordingResponse = await fetch(recordingUrl);
        if (recordingResponse.ok) {
          const audioBuffer = await recordingResponse.arrayBuffer();
          const base64Audio = btoa(String.fromCharCode(...new Uint8Array(audioBuffer)));

          // Call our Whisper transcription function
          const transcriptionResponse = await fetch(
            `${Deno.env.get('SUPABASE_URL')}/functions/v1/whisper-transcribe`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
              },
              body: JSON.stringify({
                audioData: base64Audio,
                language: session.language,
                callSid: callSid,
                clinicId: clinic.id
              }),
            }
          );

          if (transcriptionResponse.ok) {
            const transcriptionResult = await transcriptionResponse.json();
            userInput = transcriptionResult.text;
            console.log('Whisper transcription:', userInput);
          }
        }
      } catch (transcriptionError) {
        console.error('Transcription error:', transcriptionError);
        // Fall back to Twilio's speech recognition or continue without transcription
      }
    }

    // Process the speech input with the voice agent
    const voiceAgentResponse = await fetch(
      `${Deno.env.get('SUPABASE_URL')}/functions/v1/voice-agent`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
        },
        body: JSON.stringify({
          userInput: userInput,
          context: {
            clinicId: clinic.id,
            callerPhone: from,
            callSid: callSid,
            conversationState: session.conversationState,
            language: session.language
          },
          config: {
            elevenLabsApiKey: Deno.env.get('ELEVENLABS_API_KEY'),
            elevenLabsVoiceId: Deno.env.get('ELEVENLABS_VOICE_ID'),
          },
        }),
      }
    );

    if (!voiceAgentResponse.ok) {
      console.error('Voice agent error:', await voiceAgentResponse.text());
      return new Response(
        generateTwiML("I'm sorry, I'm experiencing technical difficulties. Let me transfer you to our staff.", false, true),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/xml' },
        }
      );
    }

    const agentResponse = await voiceAgentResponse.json();
    
    // Update session with new conversation state
    if (agentResponse.conversationState) {
      session.conversationState = agentResponse.conversationState;
      callSessions.set(callSid, session);
    }

    // Generate TwiML response with enhanced speech gathering
    const twimlResponse = generateTwiML(
      agentResponse.text,
      agentResponse.shouldHangup,
      agentResponse.shouldTransfer,
      agentResponse.nextAction,
      session.language
    );

    console.log('Generated TwiML:', twimlResponse);

    return new Response(twimlResponse, {
      headers: { ...corsHeaders, 'Content-Type': 'application/xml' },
    });

  } catch (error) {
    console.error('Twilio webhook error:', error);
    
    const errorResponse = generateTwiML(
      "I'm sorry, I'm experiencing technical difficulties. Please try again later or contact us directly.",
      true
    );

    return new Response(errorResponse, {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/xml' },
    });
  }
});

function generateTwiML(
  message: string,
  shouldHangup: boolean = false,
  shouldTransfer: boolean = false,
  nextAction: string = 'gather_speech',
  language: string = 'en'
): string {
  let twiml = `<?xml version="1.0" encoding="UTF-8"?>\n<Response>\n`;
  
  // Determine voice based on language
  const voice = language === 'ml' ? 'Polly.Aditi' : 'alice';
  
  // Add the main message
  twiml += `  <Say voice="${voice}" rate="medium">${escapeXml(message)}</Say>\n`;
  
  if (shouldHangup) {
    twiml += `  <Hangup/>\n`;
  } else if (shouldTransfer) {
    // In production, replace with actual clinic phone number
    const transferNumber = Deno.env.get('CLINIC_TRANSFER_NUMBER') || '+1-555-CLINIC';
    twiml += `  <Say voice="${voice}">Please hold while I transfer you.</Say>\n`;
    twiml += `  <Dial timeout="30">\n`;
    twiml += `    <Number>${transferNumber}</Number>\n`;
    twiml += `  </Dial>\n`;
    twiml += `  <Say voice="${voice}">I'm sorry, but our staff is not available right now. Please try calling back later.</Say>\n`;
    twiml += `  <Hangup/>\n`;
  } else if (nextAction === 'gather_speech') {
    // Enhanced speech gathering with recording for Whisper fallback
    twiml += `  <Gather input="speech" timeout="10" speechTimeout="3" action="${Deno.env.get('SUPABASE_URL')}/functions/v1/twilio-webhook" method="POST" enhanced="true" language="${language}">\n`;
    twiml += `    <Say voice="${voice}">Please speak your response.</Say>\n`;
    twiml += `  </Gather>\n`;
    
    // Fallback: Record for Whisper transcription if speech recognition fails
    twiml += `  <Record timeout="10" maxLength="30" action="${Deno.env.get('SUPABASE_URL')}/functions/v1/twilio-webhook" method="POST" transcribe="false" />\n`;
    
    twiml += `  <Say voice="${voice}">I didn't hear anything. Let me transfer you to our staff.</Say>\n`;
    twiml += `  <Dial timeout="30">\n`;
    twiml += `    <Number>${Deno.env.get('CLINIC_TRANSFER_NUMBER') || '+1-555-CLINIC'}</Number>\n`;
    twiml += `  </Dial>\n`;
  }
  
  twiml += `</Response>`;
  
  return twiml;
}

function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

async function handleCallCompleted(supabase: any, callSid: string, callerPhone: string) {
  try {
    const session = callSessions.get(callSid);
    if (session?.startTime) {
      const duration = Math.floor((new Date().getTime() - new Date(session.startTime).getTime()) / 1000);
      
      // Update call log with duration
      await supabase
        .from('call_logs')
        .update({ call_duration: duration })
        .eq('call_sid', callSid);
      
      // Clean up session
      callSessions.delete(callSid);
    }
  } catch (error) {
    console.error('Error handling call completion:', error);
  }
}