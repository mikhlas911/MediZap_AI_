import React, { useState, useEffect } from 'react';
import { LoginForm } from './LoginForm';
import { ClinicRegistrationForm } from './ClinicRegistrationForm';
import { ForgotPasswordForm } from './ForgotPasswordForm';
import { GuestAccessForm } from './GuestAccessForm';
import { PatientLoginForm } from './PatientLoginForm';
import { GuestSignupForm } from './GuestSignupForm';
import '../../styles/animated-background.css';

type AuthMode = 'login' | 'register' | 'guest-access' | 'forgot-password' | 'patient-login' | 'patient-signup';

export function AuthPage() {
  const [mode, setMode] = useState<AuthMode>('login');
  
  // Initialize particles.js if that option is selected
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // Dynamically load particles.js
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/particles.js/2.0.0/particles.min.js';
      script.async = true;
      
      script.onload = () => {
        // @ts-ignore - particles.js adds to window
        window.particlesJS('particles-js', {
          particles: {
            number: { value: 100, density: { enable: true, value_area: 800 } },
            color: { value: ["#0ea5e9", "#0891b2", "#0284c7", "#38bdf8"] },
            shape: { type: "circle" },
            opacity: { value: 0.6, random: true },
            size: { value: 4, random: true },
            line_linked: {
              enable: true,
              distance: 150,
              color: "#0ea5e9",
              opacity: 0.5,
              width: 1
            },
            move: {
              enable: true,
              speed: 1.8,
              direction: "none",
              random: false,
              straight: false,
              out_mode: "out",
              bounce: false
            }
          },
          interactivity: {
            detect_on: "canvas",
            events: {
              onhover: { enable: true, mode: "grab" },
              onclick: { enable: true, mode: "push" },
              resize: true
            },
            modes: {
              grab: { distance: 140, line_linked: { opacity: 0.8 } },
              push: { particles_nb: 4 },
              repulse: { distance: 150, duration: 0.4 }
            }
          },
          retina_detect: true
        });
      };
      
      document.body.appendChild(script);
      
      return () => {
        document.body.removeChild(script);
      };
    }
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 particles-container">
      <div id="particles-js" className="particles-background"></div>
      
      <div className="w-full">
        {mode === 'login' && (
          <LoginForm
            onSwitchToRegister={() => setMode('register')}
            onSwitchToGuestAccess={() => setMode('guest-access')}
            onSwitchToForgotPassword={() => setMode('forgot-password')}
            onSwitchToPatientLogin={() => setMode('patient-login')}
          />
        )}
        {mode === 'register' && (
          <ClinicRegistrationForm
            onSwitchToLogin={() => setMode('login')}
          />
        )}
        {mode === 'guest-access' && (
          <GuestAccessForm
            onSwitchToLogin={() => setMode('login')}
          />
        )}
        {mode === 'patient-login' && (
          <PatientLoginForm
            onSwitchToGuestAccess={() => setMode('guest-access')}
            onSwitchToPatientSignup={() => setMode('patient-signup')}
            onSwitchToClinicLogin={() => setMode('login')}
          />
        )}
        {mode === 'patient-signup' && (
          <GuestSignupForm
            onSwitchToLogin={() => setMode('patient-login')}
          />
        )}
        {mode === 'forgot-password' && (
          <ForgotPasswordForm
            onSwitchToLogin={() => setMode('login')}
          />
        )}
      </div>
    </div>
  );
}