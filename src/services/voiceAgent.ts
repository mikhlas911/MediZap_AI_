export interface VoiceAgentConfig {
  elevenLabsApiKey: string;
  elevenLabsVoiceId: string;
  twilioAccountSid: string;
  twilioAuthToken: string;
  twilioPhoneNumber: string;
}

export interface CallContext {
  clinicId: string;
  callerPhone: string;
  callSid: string;
}

export interface VoiceAgentResponse {
  text: string;
  audioUrl?: string;
  shouldTransfer?: boolean;
  appointmentData?: {
    departmentId: string;
    doctorId: string;
    patientName: string;
    patientPhone: string;
    appointmentDate: string;
    appointmentTime: string;
  };
}

export class VoiceAgent {
  private config: VoiceAgentConfig;
  private baseUrl: string;

  constructor(config: VoiceAgentConfig) {
    this.config = config;
    this.baseUrl = import.meta.env.VITE_SUPABASE_URL;
  }

  async processCall(userInput: string, context: CallContext): Promise<VoiceAgentResponse> {
    try {
      // This would typically call your edge function that handles the AI conversation
      const response = await fetch(`${this.baseUrl}/functions/v1/voice-agent`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          userInput,
          context,
          config: this.config,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to process voice input');
      }

      return await response.json();
    } catch (error) {
      console.error('Voice agent error:', error);
      return {
        text: "I'm sorry, I'm experiencing technical difficulties. Please try again or hold for a human representative.",
      };
    }
  }

  async generateSpeech(text: string): Promise<string> {
    try {
      const response = await fetch('https://api.elevenlabs.io/v1/text-to-speech/' + this.config.elevenLabsVoiceId, {
        method: 'POST',
        headers: {
          'Accept': 'audio/mpeg',
          'xi-api-key': this.config.elevenLabsApiKey,
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
        throw new Error('Failed to generate speech');
      }

      const audioBlob = await response.blob();
      return URL.createObjectURL(audioBlob);
    } catch (error) {
      console.error('Speech generation error:', error);
      throw error;
    }
  }
}