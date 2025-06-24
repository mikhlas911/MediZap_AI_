import { createClient } from 'npm:@supabase/supabase-js@2.39.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface VoiceChatRequest {
  audioData?: string; // Base64 encoded audio for transcription
  userInput?: string; // Direct text input (for testing or fallback)
  context: {
    clinicId: string;
    clinicName: string;
    conversationState?: ConversationState;
    language?: string;
    sessionId: string;
  };
}

interface ConversationState {
  step: 'greeting' | 'intent' | 'name' | 'phone' | 'email' | 'department' | 'doctor' | 'date' | 'time' | 'confirmation' | 'walkin_details' | 'complete';
  intent?: 'appointment' | 'walkin' | 'faq' | 'general';
  data: {
    patientName?: string;
    patientPhone?: string;
    patientEmail?: string;
    dateOfBirth?: string;
    gender?: string;
    departmentId?: string;
    departmentName?: string;
    doctorId?: string;
    doctorName?: string;
    appointmentDate?: string;
    appointmentTime?: string;
    reasonForVisit?: string;
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

    const { audioData, userInput, context }: VoiceChatRequest = await req.json();

    // Get API keys from environment
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    const elevenLabsApiKey = Deno.env.get('ELEVENLABS_API_KEY');
    const elevenLabsVoiceId = Deno.env.get('ELEVENLABS_VOICE_ID');

    if (!openaiApiKey || !elevenLabsApiKey || !elevenLabsVoiceId) {
      return new Response(
        JSON.stringify({
          text: "I'm sorry, the voice service is not properly configured.",
          shouldEnd: true,
          error: 'Missing API keys'
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

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

    let processedUserInput = userInput || '';

    // Transcribe audio if provided
    if (audioData && !userInput) {
      try {
        processedUserInput = await transcribeAudio(audioData, openaiApiKey);
      } catch (transcriptionError) {
        console.error('Transcription error:', transcriptionError);
        return new Response(
          JSON.stringify({
            text: "I'm sorry, I couldn't understand what you said. Could you please try again?",
            shouldEnd: false,
            conversationState
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }
    }

    // Process conversation
    const response = await processConversation(
      processedUserInput,
      conversationState,
      context,
      supabase,
      clinic,
      { openaiApiKey, elevenLabsApiKey, elevenLabsVoiceId }
    );

    return new Response(
      JSON.stringify(response),
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

async function transcribeAudio(audioData: string, openaiApiKey: string): Promise<string> {
  try {
    // Convert base64 audio data to blob
    const audioBuffer = Uint8Array.from(atob(audioData), c => c.charCodeAt(0));
    const audioBlob = new Blob([audioBuffer], { type: 'audio/webm' });

    // Create FormData for OpenAI Whisper API
    const formData = new FormData();
    formData.append('file', audioBlob, 'audio.webm');
    formData.append('model', 'whisper-1');
    formData.append('language', 'en');

    const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
      },
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`Transcription failed: ${response.status}`);
    }

    const result = await response.json();
    return result.text || '';
  } catch (error) {
    console.error('Transcription error:', error);
    throw error;
  }
}

async function processConversation(
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

  // Determine intent if not set
  if (state.step === 'intent') {
    if (input.includes('appointment') || input.includes('book') || input.includes('schedule')) {
      state.intent = 'appointment';
      state.step = 'name';
      state.attempts = 0;
      
      const responseText = "I'd be happy to help you book an appointment. Let's start by getting your full name.";
      const audioUrl = await generateSpeech(responseText, config);
      
      return {
        text: responseText,
        shouldEnd: false,
        conversationState: state,
        audioUrl
      };
    } else if (input.includes('walk') || input.includes('register') || input.includes('visit')) {
      state.intent = 'walkin';
      state.step = 'name';
      state.attempts = 0;
      
      const responseText = "I'll help you register as a walk-in patient. First, may I have your full name?";
      const audioUrl = await generateSpeech(responseText, config);
      
      return {
        text: responseText,
        shouldEnd: false,
        conversationState: state,
        audioUrl
      };
    } else if (input.includes('question') || input.includes('info') || input.includes('hours') || input.includes('location')) {
      state.intent = 'faq';
      
      const faqResponse = await handleFAQ(input, clinic, config);
      
      return {
        text: faqResponse.text + " Is there anything else I can help you with?",
        shouldEnd: false,
        conversationState: { ...state, step: 'intent' },
        audioUrl: faqResponse.audioUrl
      };
    } else {
      state.attempts++;
      if (state.attempts >= 3) {
        const responseText = "I understand you might need help with something specific. Let me connect you with our staff who can assist you better.";
        const audioUrl = await generateSpeech(responseText, config);
        
        return {
          text: responseText,
          shouldEnd: true,
          conversationState: state,
          audioUrl
        };
      }
      
      const responseText = "I can help you book an appointment, register as a walk-in patient, or answer questions about our services. Which would you like to do?";
      const audioUrl = await generateSpeech(responseText, config);
      
      return {
        text: responseText,
        shouldEnd: false,
        conversationState: state,
        audioUrl
      };
    }
  }

  // Handle name collection
  if (state.step === 'name') {
    const name = extractName(userInput);
    if (!name || name.length < 2) {
      state.attempts++;
      if (state.attempts >= 3) {
        const responseText = "I'm having trouble understanding your name. Let me connect you with our staff.";
        const audioUrl = await generateSpeech(responseText, config);
        return {
          text: responseText,
          shouldEnd: true,
          conversationState: state,
          audioUrl
        };
      }
      
      const responseText = "I didn't catch your name clearly. Could you please tell me your full name again?";
      const audioUrl = await generateSpeech(responseText, config);
      
      return {
        text: responseText,
        shouldEnd: false,
        conversationState: state,
        audioUrl
      };
    }

    state.data.patientName = name;
    state.step = 'phone';
    state.attempts = 0;

    const responseText = `Thank you, ${name}! Now I need your phone number for our records.`;
    const audioUrl = await generateSpeech(responseText, config);

    return {
      text: responseText,
      shouldEnd: false,
      conversationState: state,
      audioUrl
    };
  }

  // Handle phone collection
  if (state.step === 'phone') {
    const phoneNumber = extractPhoneNumber(userInput);
    if (!phoneNumber) {
      state.attempts++;
      if (state.attempts >= 3) {
        const responseText = "I'm having trouble with your phone number. Let me connect you with our staff.";
        const audioUrl = await generateSpeech(responseText, config);
        return {
          text: responseText,
          shouldEnd: true,
          conversationState: state,
          audioUrl
        };
      }
      
      const responseText = "I didn't catch your phone number clearly. Could you please say it again?";
      const audioUrl = await generateSpeech(responseText, config);
      
      return {
        text: responseText,
        shouldEnd: false,
        conversationState: state,
        audioUrl
      };
    }

    state.data.patientPhone = phoneNumber;
    
    if (state.intent === 'walkin') {
      state.step = 'walkin_details';
    } else {
      state.step = 'department';
    }
    state.attempts = 0;

    let responseText: string;
    if (state.intent === 'walkin') {
      responseText = `Got it! Your phone number is ${phoneNumber}. Now, could you tell me the reason for your visit today?`;
    } else {
      // Fetch departments for appointment booking
      const departments = await fetchDepartments(supabase, context.clinicId);
      state.data.availableDepartments = departments;
      
      const departmentsList = departments.map((dept: any) => dept.name).join(', ');
      responseText = `Perfect! Your phone number is ${phoneNumber}. We have the following departments available: ${departmentsList}. Which department would you like to schedule with?`;
    }
    
    const audioUrl = await generateSpeech(responseText, config);

    return {
      text: responseText,
      shouldEnd: false,
      conversationState: state,
      audioUrl
    };
  }

  // Handle walk-in details
  if (state.step === 'walkin_details') {
    state.data.reasonForVisit = userInput;
    
    // Register walk-in
    const walkinResult = await registerWalkin(supabase, {
      clinic_id: context.clinicId,
      patient_name: state.data.patientName!,
      contact_number: state.data.patientPhone!,
      reason_for_visit: state.data.reasonForVisit,
      status: 'waiting'
    });

    if (!walkinResult.success) {
      const responseText = "I'm sorry, there was an error registering you. Let me connect you with our staff.";
      const audioUrl = await generateSpeech(responseText, config);
      
      return {
        text: responseText,
        shouldEnd: true,
        conversationState: state,
        audioUrl
      };
    }

    state.step = 'complete';
    const responseText = `Perfect! You've been registered as a walk-in patient. Your reference number is ${walkinResult.walkin.patient_id}. Please have a seat and our staff will call you shortly. Is there anything else I can help you with?`;
    const audioUrl = await generateSpeech(responseText, config);

    return {
      text: responseText,
      shouldEnd: false,
      conversationState: state,
      audioUrl,
      walkinData: walkinResult.walkin
    };
  }

  // Handle department selection for appointments
  if (state.step === 'department') {
    const departments = state.data.availableDepartments || [];
    const matchedDept = findBestMatch(input, departments, 'name');
    
    if (!matchedDept) {
      state.attempts++;
      if (state.attempts >= 3) {
        const responseText = "I'm having trouble understanding which department you'd like. Let me connect you with our staff.";
        const audioUrl = await generateSpeech(responseText, config);
        return {
          text: responseText,
          shouldEnd: true,
          conversationState: state,
          audioUrl
        };
      }
      
      const deptList = departments.map((d: any) => d.name).join(', ');
      const responseText = `I didn't catch which department you'd like. Our available departments are: ${deptList}. Which one would you prefer?`;
      const audioUrl = await generateSpeech(responseText, config);
      
      return {
        text: responseText,
        shouldEnd: false,
        conversationState: state,
        audioUrl
      };
    }

    state.data.departmentId = matchedDept.id;
    state.data.departmentName = matchedDept.name;
    state.step = 'doctor';
    state.attempts = 0;

    // Fetch available doctors
    const doctors = await fetchDoctorsByDepartment(supabase, context.clinicId, matchedDept.id);
    state.data.availableDoctors = doctors;

    if (!doctors || doctors.length === 0) {
      const responseText = `I'm sorry, but we don't have any doctors available in ${matchedDept.name} at the moment. Would you like to try a different department?`;
      const audioUrl = await generateSpeech(responseText, config);
      
      return {
        text: responseText,
        shouldEnd: false,
        conversationState: { ...state, step: 'department', attempts: 0 },
        audioUrl
      };
    }

    if (doctors.length === 1) {
      // Auto-select the only doctor
      state.data.doctorId = doctors[0].id;
      state.data.doctorName = doctors[0].name;
      state.step = 'date';
      
      const responseText = `Great! For ${matchedDept.name}, we have Dr. ${doctors[0].name} available. What date would you like to schedule your appointment? You can say something like 'tomorrow', 'next Monday', or a specific date.`;
      const audioUrl = await generateSpeech(responseText, config);
      
      return {
        text: responseText,
        shouldEnd: false,
        conversationState: state,
        audioUrl
      };
    } else {
      const doctorsList = doctors.map((doc: any) => `Dr. ${doc.name}`).join(', ');
      const responseText = `Perfect! For ${matchedDept.name}, we have these doctors available: ${doctorsList}. Which doctor would you prefer?`;
      const audioUrl = await generateSpeech(responseText, config);
      
      return {
        text: responseText,
        shouldEnd: false,
        conversationState: state,
        audioUrl
      };
    }
  }

  // Handle doctor selection
  if (state.step === 'doctor') {
    const availableDoctors = state.data.availableDoctors || [];
    const matchedDoctor = findBestMatch(input, availableDoctors, 'name');

    if (!matchedDoctor) {
      state.attempts++;
      if (state.attempts >= 3) {
        const responseText = "I'm having trouble understanding which doctor you'd prefer. Let me connect you with our staff.";
        const audioUrl = await generateSpeech(responseText, config);
        return {
          text: responseText,
          shouldEnd: true,
          conversationState: state,
          audioUrl
        };
      }

      const docList = availableDoctors.map((d: any) => `Dr. ${d.name}`).join(', ');
      const responseText = `I didn't catch which doctor you'd like. Our available doctors are: ${docList}. Which one would you prefer?`;
      const audioUrl = await generateSpeech(responseText, config);
      
      return {
        text: responseText,
        shouldEnd: false,
        conversationState: state,
        audioUrl
      };
    }

    state.data.doctorId = matchedDoctor.id;
    state.data.doctorName = matchedDoctor.name;
    state.step = 'date';
    state.attempts = 0;

    const responseText = `Excellent! I'll schedule you with Dr. ${matchedDoctor.name}. What date would you like for your appointment? You can say something like 'tomorrow', 'next Monday', or a specific date.`;
    const audioUrl = await generateSpeech(responseText, config);

    return {
      text: responseText,
      shouldEnd: false,
      conversationState: state,
      audioUrl
    };
  }

  // Handle date selection
  if (state.step === 'date') {
    const parsedDate = parseDate(userInput);
    
    if (!parsedDate) {
      state.attempts++;
      if (state.attempts >= 3) {
        const responseText = "I'm having trouble understanding the date. Let me connect you with our staff.";
        const audioUrl = await generateSpeech(responseText, config);
        return {
          text: responseText,
          shouldEnd: true,
          conversationState: state,
          audioUrl
        };
      }

      const responseText = "I didn't catch the date. Could you please say the date again? For example, 'tomorrow', 'next Monday', or 'January 15th'.";
      const audioUrl = await generateSpeech(responseText, config);
      
      return {
        text: responseText,
        shouldEnd: false,
        conversationState: state,
        audioUrl
      };
    }

    // Validate the date
    const dateValidation = validateAppointmentDate(parsedDate);
    if (!dateValidation.isValid) {
      const audioUrl = await generateSpeech(dateValidation.message!, config);
      return {
        text: dateValidation.message!,
        shouldEnd: false,
        conversationState: state,
        audioUrl
      };
    }

    state.data.appointmentDate = parsedDate;
    state.step = 'time';
    state.attempts = 0;

    // Get available time slots
    const availableSlots = await getAvailableTimeSlots(supabase, state.data.doctorId!, parsedDate);
    state.data.availableSlots = availableSlots;

    if (availableSlots.length === 0) {
      const responseText = `I'm sorry, but Dr. ${state.data.doctorName} doesn't have any available appointments on ${formatDate(parsedDate)}. Would you like to try a different date?`;
      const audioUrl = await generateSpeech(responseText, config);
      
      return {
        text: responseText,
        shouldEnd: false,
        conversationState: { ...state, step: 'date', attempts: 0 },
        audioUrl
      };
    }

    const timeSlots = availableSlots.slice(0, 5).map(formatTime).join(', ');
    const moreSlots = availableSlots.length > 5 ? ` and ${availableSlots.length - 5} more times` : '';
    const responseText = `Perfect! Dr. ${state.data.doctorName} has these available times on ${formatDate(parsedDate)}: ${timeSlots}${moreSlots}. Which time works best for you?`;
    const audioUrl = await generateSpeech(responseText, config);

    return {
      text: responseText,
      shouldEnd: false,
      conversationState: state,
      audioUrl
    };
  }

  // Handle time selection
  if (state.step === 'time') {
    const availableSlots = state.data.availableSlots || [];
    const matchedTime = findBestTimeMatch(input, availableSlots);

    if (!matchedTime) {
      state.attempts++;
      if (state.attempts >= 3) {
        const responseText = "I'm having trouble understanding which time you'd prefer. Let me connect you with our staff.";
        const audioUrl = await generateSpeech(responseText, config);
        return {
          text: responseText,
          shouldEnd: true,
          conversationState: state,
          audioUrl
        };
      }

      const timeList = availableSlots.slice(0, 5).map(formatTime).join(', ');
      const responseText = `I didn't catch which time you'd like. Available times include: ${timeList}. Which time would you prefer?`;
      const audioUrl = await generateSpeech(responseText, config);
      
      return {
        text: responseText,
        shouldEnd: false,
        conversationState: state,
        audioUrl
      };
    }

    state.data.appointmentTime = matchedTime;
    state.step = 'confirmation';
    state.attempts = 0;

    const responseText = `Perfect! Let me confirm your appointment: ${state.data.patientName} with Dr. ${state.data.doctorName} in ${state.data.departmentName} on ${formatDate(state.data.appointmentDate!)} at ${formatTime(matchedTime)}. Should I go ahead and book this appointment for you?`;
    const audioUrl = await generateSpeech(responseText, config);

    return {
      text: responseText,
      shouldEnd: false,
      conversationState: state,
      audioUrl
    };
  }

  // Handle confirmation
  if (state.step === 'confirmation') {
    if (input.includes('yes') || input.includes('confirm') || input.includes('book') || 
        input.includes('schedule') || input.includes('okay') || input.includes('sure')) {
      
      // Book the appointment
      const appointmentResult = await bookAppointment(supabase, {
        clinic_id: context.clinicId,
        department_id: state.data.departmentId!,
        doctor_id: state.data.doctorId!,
        patient_name: state.data.patientName!,
        phone_number: state.data.patientPhone!,
        appointment_date: state.data.appointmentDate!,
        appointment_time: state.data.appointmentTime!,
        status: 'pending',
        notes: `Booked via AI voice agent on ${new Date().toISOString()}`
      });

      if (!appointmentResult.success) {
        const responseText = "I'm sorry, there was an error booking your appointment. Let me connect you with our staff.";
        const audioUrl = await generateSpeech(responseText, config);
        
        return {
          text: responseText,
          shouldEnd: true,
          conversationState: state,
          audioUrl
        };
      }

      state.step = 'complete';
      const responseText = `Excellent! Your appointment has been successfully booked. Your appointment ID is ${appointmentResult.appointment.id}. You'll receive a confirmation shortly. Is there anything else I can help you with?`;
      const audioUrl = await generateSpeech(responseText, config);

      return {
        text: responseText,
        shouldEnd: false,
        conversationState: state,
        audioUrl,
        appointmentData: {
          ...appointmentResult.appointment,
          doctor_name: state.data.doctorName,
          department_name: state.data.departmentName
        }
      };
    } else if (input.includes('no') || input.includes('cancel') || input.includes('change')) {
      const responseText = "No problem! Would you like to choose a different date or time?";
      const audioUrl = await generateSpeech(responseText, config);
      
      return {
        text: responseText,
        shouldEnd: false,
        conversationState: { ...state, step: 'date', attempts: 0 },
        audioUrl
      };
    } else {
      state.attempts++;
      if (state.attempts >= 2) {
        const responseText = "Should I book this appointment for you? Please say 'yes' to confirm or 'no' to make changes.";
        const audioUrl = await generateSpeech(responseText, config);
        
        return {
          text: responseText,
          shouldEnd: false,
          conversationState: state,
          audioUrl
        };
      }
      
      const responseText = "I didn't catch that. Should I go ahead and book this appointment? Please say 'yes' to confirm or 'no' if you'd like to make changes.";
      const audioUrl = await generateSpeech(responseText, config);
      
      return {
        text: responseText,
        shouldEnd: false,
        conversationState: state,
        audioUrl
      };
    }
  }

  // Handle completion
  if (state.step === 'complete') {
    if (input.includes('no') || input.includes('nothing') || input.includes('goodbye')) {
      const responseText = `Thank you for choosing ${clinic.name}! Have a great day!`;
      const audioUrl = await generateSpeech(responseText, config);
      
      return {
        text: responseText,
        shouldEnd: true,
        conversationState: state,
        audioUrl
      };
    } else {
      const responseText = "I'd be happy to help with anything else. What can I do for you?";
      const audioUrl = await generateSpeech(responseText, config);
      
      return {
        text: responseText,
        shouldEnd: false,
        conversationState: { ...state, step: 'intent', attempts: 0 },
        audioUrl
      };
    }
  }

  // Default fallback
  const responseText = "I'm sorry, I didn't understand that. Could you please try again?";
  const audioUrl = await generateSpeech(responseText, config);
  
  return {
    text: responseText,
    shouldEnd: false,
    conversationState: state,
    audioUrl
  };
}

// Database helper functions
async function fetchDepartments(supabase: any, clinicId: string) {
  try {
    const { data, error } = await supabase
      .from('departments')
      .select('id, name, description')
      .eq('clinic_id', clinicId)
      .eq('is_active', true)
      .order('name');

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching departments:', error);
    return [];
  }
}

async function fetchDoctorsByDepartment(supabase: any, clinicId: string, departmentId: string) {
  try {
    const { data, error } = await supabase
      .from('doctors')
      .select('id, name, specialization, available_days, available_times')
      .eq('clinic_id', clinicId)
      .eq('department_id', departmentId)
      .eq('is_active', true)
      .order('name');

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching doctors:', error);
    return [];
  }
}

async function getAvailableTimeSlots(supabase: any, doctorId: string, date: string) {
  try {
    // Get doctor's available times and days
    const { data: doctor, error: doctorError } = await supabase
      .from('doctors')
      .select('available_times, available_days')
      .eq('id', doctorId)
      .single();

    if (doctorError) throw doctorError;

    // Check if the doctor is available on this day
    const dayOfWeek = new Date(date).toLocaleDateString('en-US', { weekday: 'long' });
    if (!doctor?.available_days?.includes(dayOfWeek)) {
      return [];
    }

    // Get existing appointments for this doctor on this date
    const { data: appointments, error: appointmentsError } = await supabase
      .from('appointments')
      .select('appointment_time')
      .eq('doctor_id', doctorId)
      .eq('appointment_date', date)
      .in('status', ['pending', 'confirmed']);

    if (appointmentsError) throw appointmentsError;

    // Filter out booked time slots
    const bookedTimes = appointments?.map((apt: any) => apt.appointment_time) || [];
    const availableSlots = (doctor.available_times || []).filter((time: string) => !bookedTimes.includes(time));

    return availableSlots.sort();
  } catch (error) {
    console.error('Error fetching available time slots:', error);
    return [];
  }
}

async function bookAppointment(supabase: any, appointmentData: any) {
  try {
    const { data, error } = await supabase
      .from('appointments')
      .insert([appointmentData])
      .select()
      .single();

    if (error) throw error;

    return { success: true, appointment: data };
  } catch (error) {
    console.error('Error booking appointment:', error);
    return { success: false, error: error.message };
  }
}

async function registerWalkin(supabase: any, walkinData: any) {
  try {
    // Add patient_id for reference
    const walkinWithId = {
      ...walkinData,
      patient_id: Math.floor(Math.random() * 1000000)
    };

    const { data, error } = await supabase
      .from('walk_ins')
      .insert([walkinWithId])
      .select()
      .single();

    if (error) throw error;

    return { success: true, walkin: data };
  } catch (error) {
    console.error('Error registering walk-in:', error);
    return { success: false, error: error.message };
  }
}

async function handleFAQ(input: string, clinic: any, config: any) {
  let responseText = '';
  
  if (input.includes('hours') || input.includes('open') || input.includes('time')) {
    responseText = `${clinic.name} is typically open Monday through Friday from 9 AM to 6 PM, and Saturday from 9 AM to 2 PM. We're closed on Sundays. For specific hours, please call us at ${clinic.phone || 'our main number'}.`;
  } else if (input.includes('location') || input.includes('address') || input.includes('where')) {
    responseText = clinic.address 
      ? `${clinic.name} is located at ${clinic.address}. You can also call us at ${clinic.phone || 'our main number'} for directions.`
      : `For our location and directions, please call us at ${clinic.phone || 'our main number'}.`;
  } else if (input.includes('phone') || input.includes('contact') || input.includes('call')) {
    responseText = clinic.phone 
      ? `You can reach ${clinic.name} at ${clinic.phone}. Our staff will be happy to assist you.`
      : `Please visit our website or ask our staff for contact information.`;
  } else if (input.includes('services') || input.includes('treatment') || input.includes('department')) {
    responseText = `${clinic.name} offers comprehensive medical services including General Medicine, Pediatrics, Cardiology, Dermatology, and Orthopedics. For specific treatments or services, please speak with our staff.`;
  } else {
    responseText = `For specific information about ${clinic.name}, I recommend speaking with our staff who can provide detailed answers. You can call us at ${clinic.phone || 'our main number'} or visit our website.`;
  }
  
  const audioUrl = await generateSpeech(responseText, config);
  
  return { text: responseText, audioUrl };
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

// Helper functions for parsing user input
function extractName(input: string): string {
  const words = input.split(' ').filter(word => word.length > 1);
  const commonWords = ['my', 'name', 'is', 'i\'m', 'im', 'this', 'it\'s', 'its', 'the', 'a', 'an', 'call', 'me'];
  const nameWords = words.filter(word => !commonWords.includes(word.toLowerCase()));
  
  const extractedName = nameWords.slice(0, 2).join(' ');
  return extractedName || input.trim();
}

function extractPhoneNumber(input: string): string | null {
  const cleaned = input.replace(/[^\d\+\s]/g, '');
  const digits = cleaned.replace(/[^\d]/g, '');
  
  if (digits.length >= 10 && digits.length <= 15) {
    if (digits.length === 10) {
      return `+1${digits}`;
    } else if (digits.length === 11 && digits.startsWith('1')) {
      return `+${digits}`;
    } else {
      return `+${digits}`;
    }
  }
  
  return null;
}

function findBestMatch(input: string, items: any[], field: string): any {
  const inputLower = input.toLowerCase();
  
  // Exact match
  for (const item of items) {
    if (item[field].toLowerCase() === inputLower) {
      return item;
    }
  }
  
  // Partial match
  for (const item of items) {
    if (item[field].toLowerCase().includes(inputLower) || inputLower.includes(item[field].toLowerCase())) {
      return item;
    }
  }
  
  // Word match
  const inputWords = inputLower.split(' ');
  for (const item of items) {
    const itemWords = item[field].toLowerCase().split(' ');
    for (const inputWord of inputWords) {
      for (const itemWord of itemWords) {
        if (inputWord === itemWord && inputWord.length > 2) {
          return item;
        }
      }
    }
  }
  
  return null;
}

function findBestTimeMatch(input: string, availableSlots: string[]): string | null {
  const inputLower = input.toLowerCase();
  
  // Direct time match
  const timeRegex = /(\d{1,2})[:\s]?(\d{2})?/;
  const match = inputLower.match(timeRegex);
  
  if (match) {
    let hour = parseInt(match[1]);
    const minute = match[2] ? parseInt(match[2]) : 0;
    
    // Handle AM/PM
    if (inputLower.includes('pm') && hour < 12) {
      hour += 12;
    } else if (inputLower.includes('am') && hour === 12) {
      hour = 0;
    }
    
    const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
    
    // Find exact match
    if (availableSlots.includes(timeString)) {
      return timeString;
    }
    
    // Find closest match
    const targetMinutes = hour * 60 + minute;
    let closestSlot = null;
    let closestDiff = Infinity;
    
    for (const slot of availableSlots) {
      const [slotHour, slotMinute] = slot.split(':').map(Number);
      const slotMinutes = slotHour * 60 + slotMinute;
      const diff = Math.abs(targetMinutes - slotMinutes);
      
      if (diff < closestDiff && diff <= 30) {
        closestDiff = diff;
        closestSlot = slot;
      }
    }
    
    return closestSlot;
  }
  
  // Handle relative times
  if (inputLower.includes('morning')) {
    return availableSlots.find(slot => {
      const hour = parseInt(slot.split(':')[0]);
      return hour >= 8 && hour < 12;
    }) || null;
  }
  
  if (inputLower.includes('afternoon')) {
    return availableSlots.find(slot => {
      const hour = parseInt(slot.split(':')[0]);
      return hour >= 12 && hour < 17;
    }) || null;
  }
  
  return null;
}

function parseDate(input: string): string | null {
  const inputLower = input.toLowerCase().trim();
  const today = new Date();
  
  // Handle relative dates
  if (inputLower.includes('today')) {
    return today.toISOString().split('T')[0];
  }
  
  if (inputLower.includes('tomorrow')) {
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split('T')[0];
  }
  
  // Handle day names
  const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  for (let i = 0; i < days.length; i++) {
    if (inputLower.includes(days[i])) {
      const targetDay = new Date(today);
      const currentDay = today.getDay();
      let daysToAdd = i - currentDay;
      
      if (daysToAdd <= 0) {
        daysToAdd += 7;
      }
      
      targetDay.setDate(today.getDate() + daysToAdd);
      return targetDay.toISOString().split('T')[0];
    }
  }
  
  return null;
}

function validateAppointmentDate(dateString: string): { isValid: boolean; message?: string } {
  const today = new Date();
  const requestedDate = new Date(dateString);
  const maxDate = new Date();
  maxDate.setMonth(maxDate.getMonth() + 3);

  if (requestedDate < today) {
    return {
      isValid: false,
      message: "I'm sorry, but that date has already passed. Could you please choose a future date?"
    };
  }

  if (requestedDate > maxDate) {
    return {
      isValid: false,
      message: "I can only schedule appointments up to 3 months in advance. Could you please choose an earlier date?"
    };
  }

  const dayOfWeek = requestedDate.getDay();
  if (dayOfWeek === 0 || dayOfWeek === 6) {
    return {
      isValid: false,
      message: "We're closed on weekends. Could you please choose a weekday for your appointment?"
    };
  }

  return { isValid: true };
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}

function formatTime(timeString: string): string {
  const [hour, minute] = timeString.split(':').map(Number);
  const date = new Date();
  date.setHours(hour, minute);
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });
}