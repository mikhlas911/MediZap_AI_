import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Volume2, VolumeX, X } from 'lucide-react';

interface AIVoiceOrbProps {
  isOpen: boolean;
  onClose: () => void;
  clinicId: string;
  clinicName: string;
  onAppointmentBooked?: (appointment: any) => void;
  onWalkinRegistered?: (walkin: any) => void;
}

export function AIVoiceOrb({
  isOpen,
  onClose,
  clinicId,
  clinicName,
  onAppointmentBooked,
  onWalkinRegistered
}: AIVoiceOrbProps) {
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const [transcript, setTranscript] = useState('');
  const [response, setResponse] = useState('');
  const [conversationState, setConversationState] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [conversationHistory, setConversationHistory] = useState<Array<{
    type: 'user' | 'ai';
    text: string;
    timestamp: Date;
  }>>([]);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number>();
  const sessionIdRef = useRef<string>(`session_${Date.now()}`);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Initialize audio and start with greeting
  useEffect(() => {
    if (isOpen) {
      initializeAudio();
      startGreeting();
    } else {
      cleanup();
    }

    return () => cleanup();
  }, [isOpen]);

  const initializeAudio = async () => {
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

      setError(null);
    } catch (error) {
      console.error('Error initializing audio:', error);
      setError('Microphone access denied. Please allow microphone access to use voice features.');
    }
  };

  const startGreeting = async () => {
    try {
      setIsProcessing(true);
      
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-voice-chat`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({
            userInput: '', // Empty input triggers greeting
            context: {
              clinicId,
              clinicName,
              sessionId: sessionIdRef.current,
              language: 'en'
            }
          }),
        }
      );

      if (!response.ok) {
        throw new Error('Failed to start conversation');
      }

      const result = await response.json();
      setResponse(result.text);
      setConversationState(result.conversationState);
      
      // Add to conversation history
      setConversationHistory([{
        type: 'ai',
        text: result.text,
        timestamp: new Date()
      }]);
      
      if (result.audioUrl) {
        await playAudio(result.audioUrl);
      }
    } catch (error) {
      console.error('Error starting greeting:', error);
      setError('Failed to start conversation. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const startListening = async () => {
    if (!mediaRecorderRef.current) return;

    setIsListening(true);
    setTranscript('');
    setError(null);

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
  };

  const stopListening = () => {
    if (mediaRecorderRef.current && isListening) {
      mediaRecorderRef.current.stop();
      setIsListening(false);
      setAudioLevel(0);
      
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    }
  };

  const processAudio = async (audioBlob: Blob) => {
    setIsProcessing(true);

    try {
      // Convert audio to base64
      const arrayBuffer = await audioBlob.arrayBuffer();
      const base64Audio = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));

      // Send audio to backend for transcription and processing
      const aiResponse = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-voice-chat`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({
            audioData: base64Audio,
            context: {
              clinicId,
              clinicName,
              conversationState,
              sessionId: sessionIdRef.current,
              language: 'en'
            }
          }),
        }
      );

      if (!aiResponse.ok) {
        throw new Error('AI processing failed');
      }

      const result = await aiResponse.json();
      
      // Extract transcript from the conversation flow
      // The backend will handle transcription internally
      const userText = result.userInput || 'Audio processed';
      setTranscript(userText);
      setResponse(result.text);
      setConversationState(result.conversationState);

      // Add to conversation history
      setConversationHistory(prev => [
        ...prev,
        { type: 'user', text: userText, timestamp: new Date() },
        { type: 'ai', text: result.text, timestamp: new Date() }
      ]);

      // Handle completion events
      if (result.appointmentData && onAppointmentBooked) {
        onAppointmentBooked(result.appointmentData);
      }
      
      if (result.walkinData && onWalkinRegistered) {
        onWalkinRegistered(result.walkinData);
      }

      // Play AI response
      if (result.audioUrl) {
        await playAudio(result.audioUrl);
      }

      // End conversation if needed
      if (result.shouldEnd) {
        setTimeout(() => {
          onClose();
        }, 2000);
      }

    } catch (error) {
      console.error('Error processing audio:', error);
      setError('Failed to process audio. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const playAudio = async (audioUrl: string): Promise<void> => {
    return new Promise((resolve, reject) => {
      setIsSpeaking(true);
      
      const audio = new Audio(audioUrl);
      
      audio.onended = () => {
        setIsSpeaking(false);
        resolve();
      };
      
      audio.onerror = () => {
        setIsSpeaking(false);
        reject(new Error('Audio playback failed'));
      };
      
      audio.play().catch(reject);
    });
  };

  const monitorAudioLevel = () => {
    if (!analyserRef.current) return;

    const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
    analyserRef.current.getByteFrequencyData(dataArray);
    
    const average = dataArray.reduce((sum, value) => sum + value, 0) / dataArray.length;
    const normalizedLevel = Math.min(average / 128, 1);
    
    setAudioLevel(normalizedLevel);
    
    if (isListening) {
      animationFrameRef.current = requestAnimationFrame(monitorAudioLevel);
    }
  };

  const cleanup = () => {
    if (mediaRecorderRef.current && isListening) {
      mediaRecorderRef.current.stop();
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }

    if (audioContextRef.current) {
      audioContextRef.current.close();
    }

    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }

    setIsListening(false);
    setIsProcessing(false);
    setIsSpeaking(false);
    setAudioLevel(0);
    setConversationHistory([]);
    setTranscript('');
    setResponse('');
    setConversationState(null);
  };

  // Orb animation
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !isOpen) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationId: number;
    let frame = 0;

    const animate = () => {
      const width = canvas.width;
      const height = canvas.height;
      const centerX = width / 2;
      const centerY = height / 2;

      ctx.clearRect(0, 0, width, height);

      // Base orb
      const baseRadius = Math.min(width, height) * 0.15;
      let orbRadius = baseRadius;
      
      if (isListening) {
        orbRadius = baseRadius + (audioLevel * 20) + Math.sin(frame * 0.1) * 5;
      } else if (isProcessing) {
        orbRadius = baseRadius + Math.sin(frame * 0.2) * 8;
      } else if (isSpeaking) {
        orbRadius = baseRadius + Math.sin(frame * 0.15) * 12;
      }

      // Gradient
      const gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, orbRadius);
      gradient.addColorStop(0, '#10b981');
      gradient.addColorStop(0.7, '#059669');
      gradient.addColorStop(1, '#047857');

      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(centerX, centerY, orbRadius, 0, Math.PI * 2);
      ctx.fill();

      // Pulse rings
      if (isListening || isProcessing || isSpeaking) {
        for (let i = 0; i < 3; i++) {
          const ringRadius = orbRadius + (i + 1) * 25 + Math.sin(frame * 0.1 + i) * 10;
          const opacity = Math.max(0, 0.4 - i * 0.1 - Math.sin(frame * 0.05 + i) * 0.2);
          
          ctx.strokeStyle = `rgba(16, 185, 129, ${opacity})`;
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(centerX, centerY, ringRadius, 0, Math.PI * 2);
          ctx.stroke();
        }
      }

      frame++;
      animationId = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      if (animationId) {
        cancelAnimationFrame(animationId);
      }
    };
  }, [isOpen, isListening, isProcessing, isSpeaking, audioLevel]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-slate-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <img 
                src="/logo_symbol.png" 
                alt="MediZap AI" 
                className="h-8 w-8 object-contain"
              />
              <div>
                <h2 className="text-lg font-bold text-slate-800">MediZap AI</h2>
                <p className="text-sm text-slate-600">{clinicName}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <X className="h-5 w-5 text-slate-500" />
            </button>
          </div>
        </div>

        {/* Voice Orb */}
        <div className="p-8 text-center">
          <div className="relative mb-6">
            <canvas
              ref={canvasRef}
              width={200}
              height={200}
              className="mx-auto"
            />
            
            {/* Status overlay */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="text-center">
                <div className={`text-sm font-medium ${
                  isProcessing ? 'text-yellow-600' :
                  isSpeaking ? 'text-blue-600' :
                  isListening ? 'text-green-600' :
                  'text-slate-600'
                }`}>
                  {isProcessing ? 'Processing...' :
                   isSpeaking ? 'Speaking' :
                   isListening ? 'Listening...' :
                   'Ready'}
                </div>
              </div>
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center justify-center space-x-4 mb-6">
            <button
              onClick={isListening ? stopListening : startListening}
              disabled={isProcessing || isSpeaking}
              className={`p-4 rounded-full transition-all duration-200 ${
                isListening
                  ? 'bg-red-500 hover:bg-red-600 text-white'
                  : 'bg-emerald-500 hover:bg-emerald-600 text-white'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {isListening ? <MicOff className="h-6 w-6" /> : <Mic className="h-6 w-6" />}
            </button>
          </div>

          {/* Status Text */}
          <div className="text-center mb-4">
            <p className="text-sm text-slate-600">
              {!isListening && !isProcessing && !isSpeaking 
                ? 'Click the microphone to speak'
                : isListening 
                ? 'Speak clearly...'
                : isProcessing
                ? 'Processing your request...'
                : isSpeaking
                ? 'AI is responding...'
                : 'Ready to help you'
              }
            </p>
          </div>

          {/* Error */}
          {error && (
            <div className="bg-red-50 rounded-lg p-3 mb-4">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}
        </div>

        {/* Conversation History */}
        {conversationHistory.length > 0 && (
          <div className="border-t border-slate-200 p-4 max-h-64 overflow-y-auto">
            <h3 className="text-sm font-medium text-slate-700 mb-3">Conversation</h3>
            <div className="space-y-3">
              {conversationHistory.map((message, index) => (
                <div key={index} className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-xs rounded-lg p-3 ${
                    message.type === 'user' 
                      ? 'bg-blue-100 text-blue-900' 
                      : 'bg-emerald-100 text-emerald-900'
                  }`}>
                    <div className="text-xs mb-1 opacity-75">
                      {message.type === 'user' ? 'You' : 'MediZap AI'}
                    </div>
                    <div className="text-sm">{message.text}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}