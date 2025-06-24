import { createClient } from 'npm:@supabase/supabase-js@2.39.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface VoiceChatRequest {
  userInput: string;
  context: {
    clinicId: string;
    clinicName: string;
    conversationState?: ConversationState;
    language?: string;
    sessionId: string;
  };
  config: {
    openaiApiKey: string;
    elevenLabsApiKey: string;
    elevenLabsVoiceId: string;
  };
}

interface ConversationState {
  step: 'greeting' | 'intent' | 'appointment_booking' | 'walkin_registration' | 'faq' | 'complete';
  intent?: 'appointment' | 'walkin' | 'faq' | 'general';
  data: {
    patientName?: string;
    patientPhone?: string;
    patientEmail?: string;
    departmentId?: string;
    departmentName?: string;
    doctorId?: string;
    doctorName?: string;
    appointmentDate?: string;
    appointmentTime?: string;
    reasonForVisit?: string;
    dateOfBirth?: string;
    gender?: string;
    availableDepartments?: any[];
    availableDoctors?: any[];
    availableSlots?: string[];
  };
  attempts: number;
  lastActivity: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { userInput, context, config }: VoiceChatRequest = await req.json();

    // Initialize or get conversation state
    let conversationState: ConversationState = context.conversationState || {
      step: 'greeting',
      data: {},
      attempts: 0,
      lastActivity: new Date().toISOString()
    };

    // Update last activity
    conversationState.lastActivity = new Date().toISOString();

    // Get clinic information
    const { data: clinic, error: clinicError } = await supabase
      .from('clinics')
      .select('id, name, phone, address, email')
      .eq('id', context.clinicId)
      .single();

    if (clinicError || !clinic) {
      console.error('Clinic not found:', clinicError);
      return new Response(
        JSON.stringify({
          text: "I'm sorry, I'm having trouble accessing clinic information.",
          shouldEnd: true,
          error: 'Clinic not found'
        }),
        {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Process conversation with OpenAI
    const response = await processConversationWithAI(
      userInput,
      conversationState,
      context,
      supabase,
      clinic,
      config
    );

    return new Response(
      JSON.stringify({
        text: response.text,
        shouldEnd: response.shouldEnd,
        appointmentData: response.appointmentData,
        walkinData: response.walkinData,
        conversationState: response.conversationState,
        audioUrl: response.audioUrl
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('AI voice chat error:', error);
    return new Response(
      JSON.stringify({
        text: "I'm sorry, I'm experiencing technical difficulties. Please try again.",
        shouldEnd: true,
        error: error.message,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

async function processConversationWithAI(
  userInput: string,
  state: ConversationState,
  context: any,
  supabase: any,
  clinic: any,
  config: any
) {
  const input = userInput.toLowerCase().trim();

  // Handle greeting
  if (state.step === 'greeting') {
    state.step = 'intent';
    state.attempts = 0;
    
    const greetingText = `Welcome to ${clinic.name}! I'm your AI assistant. I can help you book an appointment, register as a walk-in patient, or answer questions about our services. How can I assist you today?`;
    
    const audioUrl = await generateSpeech(greetingText, config);
    
    return {
      text: greetingText,
      shouldEnd: false,
      conversationState: state,
      audioUrl
    };
  }

  // Use OpenAI to understand intent and generate responses
  const aiResponse = await callOpenAI(userInput, state, context, clinic, config);
  
  // Generate speech for the response
  const audioUrl = await generateSpeech(aiResponse.text, config);
  
  return {
    ...aiResponse,
    audioUrl
  };
}

async function callOpenAI(
  userInput: string,
  state: ConversationState,
  context: any,
  clinic: any,
  config: any
) {
  const systemPrompt = `You are an AI assistant for ${clinic.name}, a medical clinic. Your role is to help patients with:

1. APPOINTMENT BOOKING: Help patients book appointments by collecting their details and finding available slots
2. WALK-IN REGISTRATION: Register patients for walk-in visits
3. FAQ: Answer questions about clinic services, hours, location, etc.

Current conversation state: ${JSON.stringify(state)}

Guidelines:
- Be friendly, professional, and helpful
- Keep responses concise and clear
- Always confirm important details
- If booking appointments, collect: name, phone, preferred department/doctor, date, time
- If registering walk-ins, collect: name, phone, date of birth, gender, reason for visit
- For FAQs, provide helpful information about the clinic

Available departments: General Medicine, Pediatrics, Cardiology, Dermatology, Orthopedics

Respond in JSON format with:
{
  "text": "Your response text",
  "action": "continue|book_appointment|register_walkin|end",
  "intent": "appointment|walkin|faq|general",
  "data": {...collected data...},
  "shouldEnd": false
}`;

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userInput }
        ],
        temperature: 0.7,
        max_tokens: 500
      }),
    });

    if (!response.ok) {
      throw new Error('OpenAI API request failed');
    }

    const result = await response.json();
    const aiMessage = result.choices[0].message.content;
    
    // Try to parse JSON response
    try {
      const parsedResponse = JSON.parse(aiMessage);
      
      // Update conversation state based on AI response
      if (parsedResponse.action === 'book_appointment') {
        state.step = 'appointment_booking';
        state.intent = 'appointment';
        state.data = { ...state.data, ...parsedResponse.data };
      } else if (parsedResponse.action === 'register_walkin') {
        state.step = 'walkin_registration';
        state.intent = 'walkin';
        state.data = { ...state.data, ...parsedResponse.data };
      } else if (parsedResponse.action === 'end') {
        state.step = 'complete';
      }
      
      return {
        text: parsedResponse.text,
        shouldEnd: parsedResponse.shouldEnd || parsedResponse.action === 'end',
        conversationState: state,
        appointmentData: parsedResponse.action === 'book_appointment' ? state.data : null,
        walkinData: parsedResponse.action === 'register_walkin' ? state.data : null
      };
    } catch (parseError) {
      // If JSON parsing fails, use the raw text
      return {
        text: aiMessage,
        shouldEnd: false,
        conversationState: state
      };
    }
  } catch (error) {
    console.error('OpenAI API error:', error);
    return {
      text: "I'm sorry, I'm having trouble processing your request. Could you please try again?",
      shouldEnd: false,
      conversationState: state
    };
  }
}

async function generateSpeech(text: string, config: any): Promise<string | null> {
  try {
    const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${config.elevenLabsVoiceId}`, {
      method: 'POST',
      headers: {
        'Accept': 'audio/mpeg',
        'xi-api-key': config.elevenLabsApiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text,
        model_id: 'eleven_monolingual_v1',
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.75,
        },
      }),
    });

    if (!response.ok) {
      console.error('ElevenLabs API error:', response.status);
      return null;
    }

    const audioBlob = await response.blob();
    const arrayBuffer = await audioBlob.arrayBuffer();
    const base64Audio = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
    
    return `data:audio/mpeg;base64,${base64Audio}`;
  } catch (error) {
    console.error('Speech generation error:', error);
    return null;
  }
}