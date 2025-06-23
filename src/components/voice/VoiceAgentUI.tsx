import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Phone, PhoneOff, Volume2, VolumeX, Settings, User, Zap } from 'lucide-react';

interface VoiceAgentUIProps {
  isActive?: boolean;
  isListening?: boolean;
  isProcessing?: boolean;
  isSpeaking?: boolean;
  isConnected?: boolean;
  audioLevel?: number;
  onStartListening?: () => void;
  onStopListening?: () => void;
  onEndCall?: () => void;
  userType?: 'guest' | 'patient' | 'premium';
  patientName?: string;
  className?: string;
}

export function VoiceAgentUI({
  isActive = false,
  isListening = false,
  isProcessing = false,
  isSpeaking = false,
  isConnected = false,
  audioLevel = 0,
  onStartListening,
  onStopListening,
  onEndCall,
  userType = 'guest',
  patientName,
  className = ''
}: VoiceAgentUIProps) {
  const [animationPhase, setAnimationPhase] = useState(0);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();

  // Color schemes based on user type
  const colorSchemes = {
    guest: {
      primary: '#64748b', // slate-500
      secondary: '#94a3b8', // slate-400
      accent: '#e2e8f0', // slate-200
      glow: 'rgba(100, 116, 139, 0.3)'
    },
    patient: {
      primary: '#0ea5e9', // sky-500
      secondary: '#38bdf8', // sky-400
      accent: '#e0f2fe', // sky-50
      glow: 'rgba(14, 165, 233, 0.3)'
    },
    premium: {
      primary: '#10b981', // emerald-500
      secondary: '#34d399', // emerald-400
      accent: '#d1fae5', // emerald-100
      glow: 'rgba(16, 185, 129, 0.3)'
    }
  };

  const colors = colorSchemes[userType];

  // Animation loop for the voice visualizer
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const animate = () => {
      const width = canvas.width;
      const height = canvas.height;
      const centerX = width / 2;
      const centerY = height / 2;

      // Clear canvas
      ctx.clearRect(0, 0, width, height);

      // Set up gradient
      const gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, Math.max(width, height) / 2);
      gradient.addColorStop(0, colors.glow);
      gradient.addColorStop(1, 'transparent');

      if (isActive) {
        // Main orb
        const baseRadius = Math.min(width, height) * 0.15;
        let orbRadius = baseRadius;
        
        if (isListening) {
          orbRadius = baseRadius + (audioLevel * 20) + Math.sin(animationPhase * 0.1) * 5;
        } else if (isProcessing) {
          orbRadius = baseRadius + Math.sin(animationPhase * 0.2) * 8;
        } else if (isSpeaking) {
          orbRadius = baseRadius + Math.sin(animationPhase * 0.15) * 12;
        }

        // Outer glow
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(centerX, centerY, orbRadius * 2, 0, Math.PI * 2);
        ctx.fill();

        // Main orb
        const orbGradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, orbRadius);
        orbGradient.addColorStop(0, colors.primary);
        orbGradient.addColorStop(0.7, colors.secondary);
        orbGradient.addColorStop(1, colors.primary);

        ctx.fillStyle = orbGradient;
        ctx.beginPath();
        ctx.arc(centerX, centerY, orbRadius, 0, Math.PI * 2);
        ctx.fill();

        // Inner highlight
        const highlightGradient = ctx.createRadialGradient(
          centerX - orbRadius * 0.3, 
          centerY - orbRadius * 0.3, 
          0, 
          centerX, 
          centerY, 
          orbRadius * 0.8
        );
        highlightGradient.addColorStop(0, 'rgba(255, 255, 255, 0.6)');
        highlightGradient.addColorStop(1, 'rgba(255, 255, 255, 0)');

        ctx.fillStyle = highlightGradient;
        ctx.beginPath();
        ctx.arc(centerX, centerY, orbRadius * 0.8, 0, Math.PI * 2);
        ctx.fill();

        // Animated rings for different states
        if (isListening || isProcessing || isSpeaking) {
          const ringCount = isListening ? 3 : isProcessing ? 2 : 4;
          
          for (let i = 0; i < ringCount; i++) {
            const ringRadius = orbRadius + (i + 1) * 25 + Math.sin(animationPhase * 0.1 + i) * 10;
            const opacity = Math.max(0, 0.4 - i * 0.1 - Math.sin(animationPhase * 0.05 + i) * 0.2);
            
            ctx.strokeStyle = `${colors.primary}${Math.floor(opacity * 255).toString(16).padStart(2, '0')}`;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(centerX, centerY, ringRadius, 0, Math.PI * 2);
            ctx.stroke();
          }
        }

        // Audio level bars for listening state
        if (isListening && audioLevel > 0) {
          const barCount = 12;
          const barRadius = orbRadius + 40;
          
          for (let i = 0; i < barCount; i++) {
            const angle = (i / barCount) * Math.PI * 2;
            const barHeight = 5 + audioLevel * 20 + Math.sin(animationPhase * 0.2 + i) * 5;
            
            const x1 = centerX + Math.cos(angle) * barRadius;
            const y1 = centerY + Math.sin(angle) * barRadius;
            const x2 = centerX + Math.cos(angle) * (barRadius + barHeight);
            const y2 = centerY + Math.sin(angle) * (barRadius + barHeight);
            
            ctx.strokeStyle = colors.secondary;
            ctx.lineWidth = 3;
            ctx.lineCap = 'round';
            ctx.beginPath();
            ctx.moveTo(x1, y1);
            ctx.lineTo(x2, y2);
            ctx.stroke();
          }
        }
      }

      setAnimationPhase(prev => prev + 1);
      animationRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isActive, isListening, isProcessing, isSpeaking, audioLevel, colors, animationPhase]);

  // Set canvas size
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resizeCanvas = () => {
      const size = Math.min(400, window.innerWidth * 0.8);
      canvas.width = size;
      canvas.height = size;
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    return () => window.removeEventListener('resize', resizeCanvas);
  }, []);

  const getStatusText = () => {
    if (!isConnected) return 'Disconnected';
    if (isProcessing) return 'Processing...';
    if (isSpeaking) return 'Speaking';
    if (isListening) return 'Listening...';
    if (isActive) return 'Ready';
    return 'Inactive';
  };

  const getStatusColor = () => {
    if (!isConnected) return 'text-red-500';
    if (isProcessing) return 'text-yellow-500';
    if (isSpeaking) return 'text-blue-500';
    if (isListening) return 'text-green-500';
    return 'text-slate-500';
  };

  const getUserBadge = () => {
    const badges = {
      guest: { icon: User, label: 'Guest', color: 'bg-slate-100 text-slate-700' },
      patient: { icon: User, label: 'Patient', color: 'bg-sky-100 text-sky-700' },
      premium: { icon: Zap, label: 'Premium', color: 'bg-emerald-100 text-emerald-700' }
    };

    const badge = badges[userType];
    const Icon = badge.icon;

    return (
      <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${badge.color}`}>
        <Icon className="h-4 w-4 mr-1" />
        {badge.label}
      </div>
    );
  };

  return (
    <div className={`flex flex-col items-center space-y-6 ${className}`}>
      {/* User Info */}
      <div className="text-center space-y-2">
        <div className="flex items-center justify-center space-x-3">
          <img 
            src="/logo_symbol.png" 
            alt="MediZap AI" 
            className="h-8 w-8 object-contain"
          />
          <h2 className="text-2xl font-bold text-slate-800">MediZap AI</h2>
        </div>
        <div className="flex items-center justify-center space-x-3">
          {getUserBadge()}
          {patientName && (
            <span className="text-slate-600">Welcome, {patientName}</span>
          )}
        </div>
      </div>

      {/* Voice Visualizer */}
      <div className="relative">
        <canvas
          ref={canvasRef}
          className="max-w-full h-auto"
          style={{ filter: 'drop-shadow(0 4px 20px rgba(0, 0, 0, 0.1))' }}
        />
        
        {/* Status overlay */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="text-center">
            <div className={`text-lg font-medium ${getStatusColor()}`}>
              {getStatusText()}
            </div>
            {audioLevel > 0 && isListening && (
              <div className="mt-2">
                <div className="w-24 h-2 bg-slate-200 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-emerald-400 to-sky-400 transition-all duration-100"
                    style={{ width: `${Math.min(audioLevel * 100, 100)}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center space-x-4">
        {isConnected ? (
          <>
            <button
              onClick={isListening ? onStopListening : onStartListening}
              className={`p-4 rounded-full transition-all duration-200 ${
                isListening
                  ? 'bg-red-500 hover:bg-red-600 text-white'
                  : 'bg-emerald-500 hover:bg-emerald-600 text-white'
              }`}
              disabled={isProcessing}
            >
              {isListening ? <MicOff className="h-6 w-6" /> : <Mic className="h-6 w-6" />}
            </button>
            
            <button
              onClick={onEndCall}
              className="p-4 rounded-full bg-red-500 hover:bg-red-600 text-white transition-all duration-200"
            >
              <PhoneOff className="h-6 w-6" />
            </button>
          </>
        ) : (
          <button
            onClick={onStartListening}
            className="p-4 rounded-full bg-emerald-500 hover:bg-emerald-600 text-white transition-all duration-200"
          >
            <Phone className="h-6 w-6" />
          </button>
        )}
      </div>

      {/* Instructions */}
      <div className="text-center max-w-md">
        <p className="text-sm text-slate-600">
          {!isConnected 
            ? 'Click the phone button to start your voice session'
            : isListening 
            ? 'Speak clearly to book your appointment'
            : isProcessing
            ? 'Processing your request...'
            : isSpeaking
            ? 'AI is responding...'
            : 'Click the microphone to speak'
          }
        </p>
      </div>
    </div>
  );
}