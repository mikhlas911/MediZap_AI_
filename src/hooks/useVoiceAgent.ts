import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../lib/supabase';

interface VoiceAgentConfig {
  clinicId?: string;
  userType?: 'guest' | 'patient' | 'premium';
  patientName?: string;
  language?: 'en' | 'hi' | 'ml';
}

interface VoiceAgentState {
  isConnected: boolean;
  isListening: boolean;
  isProcessing: boolean;
  isSpeaking: boolean;
  audioLevel: number;
  transcript: string;
  response: string;
  error: string | null;
  appointmentData: any | null;
  patientData: any | null;
}

export function useVoiceAgent(config: VoiceAgentConfig) {
  const [state, setState] = useState<VoiceAgentState>({
    isConnected: false,
    isListening: false,
    isProcessing: false,
    isSpeaking: false,
    audioLevel: 0,
    transcript: '',
    response: '',
    error: null,
    appointmentData: null,
    patientData: null
  });

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number>();
  const conversationStateRef = useRef<any>(null);
  const speechSynthesisRef = useRef<SpeechSynthesisUtterance | null>(null);

  // Initialize audio context and analyzer
  const initializeAudio = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 16000
        } 
      });
      
      streamRef.current = stream;
      
      // Create audio context for level monitoring
      audioContextRef.current = new AudioContext();
      const source = audioContextRef.current.createMediaStreamSource(stream);
      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 256;
      source.connect(analyserRef.current);

      // Create media recorder
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus') 
        ? 'audio/webm;codecs=opus' 
        : 'audio/webm';
      
      mediaRecorderRef.current = new MediaRecorder(stream, { mimeType });

      setState(prev => ({ ...prev, isConnected: true, error: null }));
      return true;
    } catch (error) {
      console.error('Error initializing audio:', error);
      setState(prev => ({ 
        ...prev, 
        error: 'Microphone access denied. Please allow microphone access to use voice features.',
        isConnected: false 
      }));
      return false;
    }
  }, []);

  // Monitor audio levels
  const monitorAudioLevel = useCallback(() => {
    if (!analyserRef.current) return;

    const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
    analyserRef.current.getByteFrequencyData(dataArray);
    
    const average = dataArray.reduce((sum, value) => sum + value, 0) / dataArray.length;
    const normalizedLevel = Math.min(average / 128, 1);
    
    setState(prev => ({ ...prev, audioLevel: normalizedLevel }));
    
    if (state.isListening) {
      animationFrameRef.current = requestAnimationFrame(monitorAudioLevel);
    }
  }, [state.isListening]);

  // Start listening
  const startListening = useCallback(async () => {
    if (!state.isConnected) {
      const initialized = await initializeAudio();
      if (!initialized) return;
    }

    if (!mediaRecorderRef.current) return;

    setState(prev => ({ ...prev, isListening: true, transcript: '', error: null }));

    const audioChunks: Blob[] = [];
    
    mediaRecorderRef.current.ondataavailable = (event) => {
      if (event.data.size > 0) {
        audioChunks.push(event.data);
      }
    };

    mediaRecorderRef.current.onstop = async () => {
      const audioBlob = new Blob(audioChunks, { type: 'audio/webm;codecs=opus' });
      await processAudio(audioBlob);
    };

    mediaRecorderRef.current.start();
    monitorAudioLevel();
  }, [state.isConnected, initializeAudio, monitorAudioLevel]);

  // Stop listening
  const stopListening = useCallback(() => {
    if (mediaRecorderRef.current && state.isListening) {
      mediaRecorderRef.current.stop();
      setState(prev => ({ ...prev, isListening: false, audioLevel: 0 }));
      
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    }
  }, [state.isListening]);

  // Process audio with speech recognition
  const processAudio = useCallback(async (audioBlob: Blob) => {
    setState(prev => ({ ...prev, isProcessing: true }));

    try {
      // Convert audio blob to base64
      const arrayBuffer = await audioBlob.arrayBuffer();
      const base64Audio = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));

      // Call Whisper transcription function
      const transcriptionResponse = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/whisper-transcribe`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({
            audioData: base64Audio,
            language: config.language || 'en',
            clinicId: config.clinicId
          }),
        }
      );

      if (!transcriptionResponse.ok) {
        throw new Error('Transcription failed');
      }

      const transcriptionResult = await transcriptionResponse.json();
      const userInput = transcriptionResult.text;

      setState(prev => ({ ...prev, transcript: userInput }));

      // Process with voice agent
      await processWithVoiceAgent(userInput);

    } catch (error) {
      console.error('Error processing audio:', error);
      setState(prev => ({ 
        ...prev, 
        error: 'Failed to process audio. Please try again.',
        isProcessing: false 
      }));
    }
  }, [config.clinicId, config.language]);

  // Process with voice agent
  const processWithVoiceAgent = useCallback(async (userInput: string) => {
    try {
      const voiceAgentResponse = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/voice-agent`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({
            userInput,
            context: {
              clinicId: config.clinicId,
              callerPhone: 'web-interface',
              callSid: `web-${Date.now()}`,
              conversationState: conversationStateRef.current,
              userType: config.userType,
              patientName: config.patientName,
              language: config.language || 'en'
            },
            config: {
              elevenLabsApiKey: import.meta.env.VITE_ELEVENLABS_API_KEY,
              elevenLabsVoiceId: import.meta.env.VITE_ELEVENLABS_VOICE_ID,
            },
          }),
        }
      );

      if (!voiceAgentResponse.ok) {
        throw new Error('Voice agent request failed');
      }

      const agentResponse = await voiceAgentResponse.json();
      
      // Update conversation state
      if (agentResponse.conversationState) {
        conversationStateRef.current = agentResponse.conversationState;
      }

      setState(prev => ({ 
        ...prev, 
        response: agentResponse.text,
        isProcessing: false,
        appointmentData: agentResponse.appointmentData || prev.appointmentData,
        patientData: agentResponse.patientData || prev.patientData
      }));

      // Synthesize speech
      if (agentResponse.text) {
        await synthesizeSpeech(agentResponse.text);
      }

    } catch (error) {
      console.error('Error with voice agent:', error);
      setState(prev => ({ 
        ...prev, 
        error: 'Failed to process request. Please try again.',
        isProcessing: false 
      }));
    }
  }, [config]);

  // Synthesize speech using browser's built-in TTS
  const synthesizeSpeech = useCallback(async (text: string) => {
    try {
      setState(prev => ({ ...prev, isSpeaking: true }));

      // Cancel any ongoing speech
      speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(text);
      speechSynthesisRef.current = utterance;

      // Configure voice based on language
      const voices = speechSynthesis.getVoices();
      let selectedVoice = null;

      if (config.language === 'hi') {
        selectedVoice = voices.find(voice => 
          voice.lang.includes('hi') || voice.name.includes('Hindi')
        );
      } else if (config.language === 'ml') {
        selectedVoice = voices.find(voice => 
          voice.lang.includes('ml') || voice.name.includes('Malayalam')
        );
      } else {
        selectedVoice = voices.find(voice => 
          voice.lang.includes('en') && voice.name.includes('Female')
        ) || voices.find(voice => voice.lang.includes('en'));
      }

      if (selectedVoice) {
        utterance.voice = selectedVoice;
      }

      utterance.rate = 0.9;
      utterance.pitch = 1;
      utterance.volume = 0.8;

      utterance.onend = () => {
        setState(prev => ({ ...prev, isSpeaking: false }));
        speechSynthesisRef.current = null;
      };

      utterance.onerror = () => {
        setState(prev => ({ ...prev, isSpeaking: false }));
        speechSynthesisRef.current = null;
      };

      speechSynthesis.speak(utterance);

    } catch (error) {
      console.error('Error synthesizing speech:', error);
      setState(prev => ({ ...prev, isSpeaking: false }));
    }
  }, [config.language]);

  // End session
  const endSession = useCallback(() => {
    // Stop any ongoing processes
    if (mediaRecorderRef.current && state.isListening) {
      mediaRecorderRef.current.stop();
    }

    // Stop speech synthesis
    speechSynthesis.cancel();
    speechSynthesisRef.current = null;

    // Close audio streams
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }

    // Close audio context
    if (audioContextRef.current) {
      audioContextRef.current.close();
    }

    // Cancel animation frame
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }

    // Reset state
    setState({
      isConnected: false,
      isListening: false,
      isProcessing: false,
      isSpeaking: false,
      audioLevel: 0,
      transcript: '',
      response: '',
      error: null,
      appointmentData: null,
      patientData: null
    });

    // Reset conversation state
    conversationStateRef.current = null;
  }, [state.isListening]);

  // Load voices when component mounts
  useEffect(() => {
    const loadVoices = () => {
      speechSynthesis.getVoices();
    };

    loadVoices();
    speechSynthesis.addEventListener('voiceschanged', loadVoices);

    return () => {
      speechSynthesis.removeEventListener('voiceschanged', loadVoices);
    };
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      endSession();
    };
  }, [endSession]);

  return {
    ...state,
    startListening,
    stopListening,
    endSession
  };
}