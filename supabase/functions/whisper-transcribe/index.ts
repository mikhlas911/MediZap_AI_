import { createClient } from 'npm:@supabase/supabase-js@2.39.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface TranscriptionRequest {
  audioData: string; // Base64 encoded audio
  language?: string; // Language code (e.g., 'en', 'ml' for Malayalam)
  callSid?: string;
  clinicId?: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { audioData, language = 'en', callSid, clinicId }: TranscriptionRequest = await req.json();

    if (!audioData) {
      return new Response(
        JSON.stringify({ error: 'Audio data is required' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openaiApiKey) {
      return new Response(
        JSON.stringify({ error: 'OpenAI API key not configured' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Convert base64 audio data to blob
    const audioBuffer = Uint8Array.from(atob(audioData), c => c.charCodeAt(0));
    const audioBlob = new Blob([audioBuffer], { type: 'audio/wav' });

    // Create FormData for OpenAI Whisper API
    const formData = new FormData();
    formData.append('file', audioBlob, 'audio.wav');
    formData.append('model', 'whisper-1');
    if (language) {
      formData.append('language', language);
    }

    // Call OpenAI Whisper API
    const whisperResponse = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
      },
      body: formData,
    });

    if (!whisperResponse.ok) {
      const errorText = await whisperResponse.text();
      console.error('Whisper API error:', errorText);
      return new Response(
        JSON.stringify({ error: 'Transcription failed', details: errorText }),
        {
          status: whisperResponse.status,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const transcriptionResult = await whisperResponse.json();
    const transcribedText = transcriptionResult.text;

    // Log the transcription if call context is provided
    if (callSid && clinicId) {
      try {
        const supabase = createClient(
          Deno.env.get('VITE_SUPABASE_URL') ?? '',
          Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        );

        await supabase
          .from('conversation_logs')
          .insert([{
            clinic_id: clinicId,
            call_sid: callSid,
            conversation_step: 'transcription',
            user_input: transcribedText,
            agent_response: null,
            created_at: new Date().toISOString()
          }]);
      } catch (logError) {
        console.error('Error logging transcription:', logError);
        // Don't fail the request if logging fails
      }
    }

    return new Response(
      JSON.stringify({
        text: transcribedText,
        language: language,
        confidence: transcriptionResult.confidence || null,
        duration: transcriptionResult.duration || null
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Whisper transcription error:', error);
    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        details: error.message
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});