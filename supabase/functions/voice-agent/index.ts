import { createClient } from 'npm:@supabase/supabase-js@2.39.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface VoiceAgentRequest {
  userInput: string;
  context: {
    clinicId: string;
    callerPhone: string;
    callSid: string;
    conversationState?: ConversationState;
    language?: string;
    userType?: 'guest' | 'patient' | 'premium';
    patientName?: string;
  };
  config: {
    elevenLabsApiKey: string;
    elevenLabsVoiceId: string;
  };
}

interface ConversationState {
  step: 'greeting' | 'name' | 'phone' | 'email' | 'dob' | 'department' | 'doctor' | 'date' | 'time' | 'confirmation' | 'complete' | 'transfer' | 'patient_registration';
  data: {
    patientName?: string;
    patientPhone?: string;
    patientEmail?: string;
    patientDOB?: string;
    departmentId?: string;
    departmentName?: string;
    doctorId?: string;
    doctorName?: string;
    appointmentDate?: string;
    appointmentTime?: string;
    availableDoctors?: any[];
    availableSlots?: string[];
    appointmentNotes?: string;
    isNewPatient?: boolean;
    registrationComplete?: boolean;
  };
  attempts: number;
  lastActivity: string;
}

interface Department {
  id: string;
  name: string;
  description?: string;
  is_active: boolean;
}

interface Doctor {
  id: string;
  name: string;
  department_id: string;
  specialization?: string;
  available_days: string[];
  available_times: string[];
  is_active: boolean;
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

    const { userInput, context, config }: VoiceAgentRequest = await req.json();

    console.log('=== VOICE AGENT REQUEST ===');
    console.log('User Input:', userInput);
    console.log('Context:', JSON.stringify(context, null, 2));

    // Initialize or get conversation state
    let conversationState: ConversationState = context.conversationState || {
      step: 'greeting',
      data: {
        isNewPatient: context.userType === 'guest'
      },
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
          text: "I'm sorry, I'm having trouble accessing clinic information. Let me transfer you to our staff.",
          shouldTransfer: true,
          error: 'Clinic not found'
        }),
        {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    console.log('Clinic found:', clinic.name);

    // Process user input and determine response
    const response = await processConversation(
      userInput,
      conversationState,
      context,
      supabase,
      clinic
    );

    // Log the conversation step
    await logConversation(supabase, context, userInput, response.text, conversationState.step, conversationState.data);

    // Create or update call log
    await updateCallLog(supabase, context, conversationState, response.appointmentData, response.patientData);

    console.log('=== VOICE AGENT RESPONSE ===');
    console.log('Response Text:', response.text);
    console.log('Conversation State:', JSON.stringify(response.conversationState, null, 2));

    return new Response(
      JSON.stringify({
        text: response.text,
        shouldTransfer: response.shouldTransfer,
        shouldHangup: response.shouldHangup,
        appointmentData: response.appointmentData,
        patientData: response.patientData,
        conversationState: response.conversationState,
        nextAction: response.nextAction
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Voice agent error:', error);
    return new Response(
      JSON.stringify({
        text: "I'm sorry, I'm experiencing technical difficulties. Please hold while I transfer you to our staff.",
        shouldTransfer: true,
        error: error.message,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

async function processConversation(
  userInput: string,
  state: ConversationState,
  context: any,
  supabase: any,
  clinic: any
) {
  const input = userInput.toLowerCase().trim();
  
  console.log(`=== PROCESSING CONVERSATION STEP: ${state.step} ===`);
  console.log('Raw user input:', userInput);
  console.log('Processed input:', input);
  console.log('Current state data:', JSON.stringify(state.data, null, 2));
  
  // Handle common requests to transfer to human
  if (input.includes('human') || input.includes('person') || input.includes('staff') || 
      input.includes('representative') || input.includes('transfer') || input.includes('operator')) {
    return {
      text: "Of course! Let me transfer you to one of our staff members who can assist you further. Please hold on.",
      shouldTransfer: true,
      conversationState: { ...state, step: 'transfer' }
    };
  }

  // Handle emergency or urgent requests
  if (input.includes('emergency') || input.includes('urgent') || input.includes('pain')) {
    return {
      text: "This sounds urgent. Let me immediately transfer you to our medical staff who can help you right away.",
      shouldTransfer: true,
      conversationState: { ...state, step: 'transfer' }
    };
  }

  switch (state.step) {
    case 'greeting':
      if (state.data.isNewPatient) {
        state.step = 'name';
        state.attempts = 0;
        return {
          text: `Hello! Welcome to ${clinic?.name || 'our clinic'}. I'm your AI assistant, and I can help you register as a new patient and book an appointment. To get started, may I please have your full name?`,
          shouldTransfer: false,
          conversationState: state,
          nextAction: 'gather_speech'
        };
      } else {
        state.step = 'department';
        state.attempts = 0;
        return {
          text: `Hello ${context.patientName || ''}! Welcome back to ${clinic?.name || 'our clinic'}. I'm here to help you book an appointment. Which department would you like to schedule with today?`,
          shouldTransfer: false,
          conversationState: state,
          nextAction: 'gather_speech'
        };
      }

    case 'name':
      console.log('Processing name extraction...');
      if (input.length < 2) {
        state.attempts++;
        if (state.attempts >= 3) {
          return {
            text: "I'm having trouble understanding your name. Let me transfer you to our staff for assistance.",
            shouldTransfer: true,
            conversationState: state
          };
        }
        return {
          text: "I didn't catch that clearly. Could you please tell me your full name again?",
          shouldTransfer: false,
          conversationState: state,
          nextAction: 'gather_speech'
        };
      }

      const name = extractName(userInput);
      console.log('Extracted name:', name);
      
      if (name.length < 2) {
        state.attempts++;
        return {
          text: "I need your full name to register you. Could you please say your first and last name?",
          shouldTransfer: false,
          conversationState: state,
          nextAction: 'gather_speech'
        };
      }

      state.data.patientName = name;
      state.step = 'phone';
      state.attempts = 0;

      return {
        text: `Thank you, ${name}! Now I need your phone number for our records. Please tell me your phone number.`,
        shouldTransfer: false,
        conversationState: state,
        nextAction: 'gather_speech'
      };

    case 'phone':
      console.log('Processing phone number extraction...');
      const phoneNumber = extractPhoneNumber(userInput);
      console.log('Extracted phone number:', phoneNumber);
      
      if (!phoneNumber) {
        state.attempts++;
        if (state.attempts >= 3) {
          return {
            text: "I'm having trouble understanding your phone number. Let me transfer you to our staff.",
            shouldTransfer: true,
            conversationState: state
          };
        }
        return {
          text: "I didn't catch your phone number clearly. Could you please say it again, including the area code?",
          shouldTransfer: false,
          conversationState: state,
          nextAction: 'gather_speech'
        };
      }

      state.data.patientPhone = phoneNumber;
      state.step = 'email';
      state.attempts = 0;

      return {
        text: `Got it! Your phone number is ${phoneNumber}. Now, could you please provide your email address? You can spell it out if needed.`,
        shouldTransfer: false,
        conversationState: state,
        nextAction: 'gather_speech'
      };

    case 'email':
      console.log('Processing email extraction...');
      const email = extractEmail(userInput);
      console.log('Extracted email:', email);
      
      if (!email) {
        state.attempts++;
        if (state.attempts >= 3) {
          // Skip email and continue
          state.step = 'dob';
          state.attempts = 0;
          return {
            text: "That's okay, we can skip the email for now. Could you please tell me your date of birth? For example, 'January 15th, 1990'.",
            shouldTransfer: false,
            conversationState: state,
            nextAction: 'gather_speech'
          };
        }
        return {
          text: "I didn't catch your email clearly. Could you spell it out for me, or say 'skip' if you'd prefer not to provide it?",
          shouldTransfer: false,
          conversationState: state,
          nextAction: 'gather_speech'
        };
      }

      state.data.patientEmail = email;
      state.step = 'dob';
      state.attempts = 0;

      return {
        text: `Perfect! I have your email as ${email}. Now, could you please tell me your date of birth? For example, 'January 15th, 1990'.`,
        shouldTransfer: false,
        conversationState: state,
        nextAction: 'gather_speech'
      };

    case 'dob':
      console.log('Processing date of birth extraction...');
      const dateOfBirth = parseDate(userInput);
      console.log('Extracted date of birth:', dateOfBirth);
      
      if (!dateOfBirth) {
        state.attempts++;
        if (state.attempts >= 3) {
          return {
            text: "I'm having trouble understanding your date of birth. Let me transfer you to our staff.",
            shouldTransfer: true,
            conversationState: state
          };
        }
        return {
          text: "I didn't catch your date of birth. Could you say it again? For example, 'January 15th, 1990' or 'January 15, 1990'.",
          shouldTransfer: false,
          conversationState: state,
          nextAction: 'gather_speech'
        };
      }

      state.data.patientDOB = dateOfBirth;
      
      // Register the patient
      const registrationResult = await registerPatient(supabase, {
        name: state.data.patientName!,
        phone: state.data.patientPhone!,
        email: state.data.patientEmail,
        dateOfBirth: dateOfBirth,
        clinicId: context.clinicId
      });

      if (!registrationResult.success) {
        return {
          text: "I'm sorry, there was an error registering you. Let me transfer you to our staff who can help.",
          shouldTransfer: true,
          conversationState: state
        };
      }

      state.data.registrationComplete = true;
      state.step = 'department';
      state.attempts = 0;

      // Fetch available departments
      console.log('Fetching departments for clinic:', context.clinicId);
      const departments = await fetchDepartments(supabase, context.clinicId);
      console.log('Found departments:', departments.length, departments.map(d => d.name));
      
      if (!departments || departments.length === 0) {
        return {
          text: "Great! You're now registered. However, I'm having trouble accessing our department information. Let me transfer you to our staff to complete your appointment booking.",
          shouldTransfer: true,
          conversationState: state,
          patientData: registrationResult.patient
        };
      }

      const departmentsList = departments
        .map((dept: Department) => dept.name)
        .join(', ');

      return {
        text: `Excellent! You're now registered as a patient. Now let's book your appointment. We have the following departments available: ${departmentsList}. Which department would you like to schedule with?`,
        shouldTransfer: false,
        conversationState: state,
        patientData: registrationResult.patient,
        nextAction: 'gather_speech'
      };

    case 'department':
      console.log('Processing department selection...');
      const departments = await fetchDepartments(supabase, context.clinicId);
      console.log('Available departments:', departments.map(d => d.name));
      
      const matchedDept = findBestMatch(input, departments, 'name');
      console.log('Matched department:', matchedDept?.name || 'None');
      
      if (!matchedDept) {
        state.attempts++;
        if (state.attempts >= 3) {
          return {
            text: "I'm having trouble understanding which department you'd like. Let me transfer you to our staff who can help you better.",
            shouldTransfer: true,
            conversationState: state
          };
        }
        
        const deptList = departments.map((d: Department) => d.name).join(', ');
        return {
          text: `I didn't catch which department you'd like. Our available departments are: ${deptList}. Which one would you prefer?`,
          shouldTransfer: false,
          conversationState: state,
          nextAction: 'gather_speech'
        };
      }

      state.data.departmentId = matchedDept.id;
      state.data.departmentName = matchedDept.name;
      state.step = 'doctor';
      state.attempts = 0;

      // Fetch available doctors for the selected department
      console.log('Fetching doctors for department:', matchedDept.name);
      const doctors = await fetchDoctorsByDepartment(supabase, context.clinicId, matchedDept.id);
      console.log('Found doctors:', doctors.length, doctors.map(d => d.name));

      if (!doctors || doctors.length === 0) {
        return {
          text: `I'm sorry, but we don't have any doctors available in ${matchedDept.name} at the moment. Would you like to try a different department, or shall I transfer you to our staff?`,
          shouldTransfer: false,
          conversationState: { ...state, step: 'department', attempts: 0 },
          nextAction: 'gather_speech'
        };
      }

      state.data.availableDoctors = doctors;

      if (doctors.length === 1) {
        // Only one doctor, auto-select
        state.data.doctorId = doctors[0].id;
        state.data.doctorName = doctors[0].name;
        state.step = 'date';
        return {
          text: `Perfect! For ${matchedDept.name}, we have Dr. ${doctors[0].name} available. What date would you like to schedule your appointment? You can say something like 'tomorrow', 'next Monday', or 'January 15th'.`,
          shouldTransfer: false,
          conversationState: state,
          nextAction: 'gather_speech'
        };
      } else {
        const doctorsList = doctors
          .map((doc: Doctor) => `Dr. ${doc.name}`)
          .join(', ');

        return {
          text: `Great choice! For ${matchedDept.name}, we have these doctors available: ${doctorsList}. Which doctor would you prefer?`,
          shouldTransfer: false,
          conversationState: state,
          nextAction: 'gather_speech'
        };
      }

    case 'doctor':
      console.log('Processing doctor selection...');
      const availableDoctors = state.data.availableDoctors || [];
      console.log('Available doctors:', availableDoctors.map(d => d.name));
      
      const matchedDoctor = findBestMatch(input, availableDoctors, 'name');
      console.log('Matched doctor:', matchedDoctor?.name || 'None');

      if (!matchedDoctor) {
        state.attempts++;
        if (state.attempts >= 3) {
          return {
            text: "I'm having trouble understanding which doctor you'd prefer. Let me transfer you to our staff.",
            shouldTransfer: true,
            conversationState: state
          };
        }

        const docList = availableDoctors.map((d: Doctor) => `Dr. ${d.name}`).join(', ');
        return {
          text: `I didn't catch which doctor you'd like. Our available doctors are: ${docList}. Which one would you prefer?`,
          shouldTransfer: false,
          conversationState: state,
          nextAction: 'gather_speech'
        };
      }

      state.data.doctorId = matchedDoctor.id;
      state.data.doctorName = matchedDoctor.name;
      state.step = 'date';
      state.attempts = 0;

      return {
        text: `Excellent! I'll schedule you with Dr. ${matchedDoctor.name}. What date would you like for your appointment? You can say something like 'tomorrow', 'next Monday', or 'January 15th'.`,
        shouldTransfer: false,
        conversationState: state,
        nextAction: 'gather_speech'
      };

    case 'date':
      console.log('Processing date selection...');
      const parsedDate = parseDate(userInput);
      console.log('Parsed date:', parsedDate);
      
      if (!parsedDate) {
        state.attempts++;
        if (state.attempts >= 3) {
          return {
            text: "I'm having trouble understanding the date you'd like. Let me transfer you to our staff who can help schedule your appointment.",
            shouldTransfer: true,
            conversationState: state
          };
        }

        return {
          text: "I didn't catch the date. Could you please say the date again? For example, 'tomorrow', 'next Monday', or 'January 15th'.",
          shouldTransfer: false,
          conversationState: state,
          nextAction: 'gather_speech'
        };
      }

      // Validate the date
      const dateValidation = validateAppointmentDate(parsedDate);
      if (!dateValidation.isValid) {
        return {
          text: dateValidation.message,
          shouldTransfer: false,
          conversationState: state,
          nextAction: 'gather_speech'
        };
      }

      state.data.appointmentDate = parsedDate;
      state.step = 'time';
      state.attempts = 0;

      // Get available time slots for the selected doctor and date
      console.log('Fetching available time slots for doctor:', state.data.doctorName, 'on date:', parsedDate);
      const availableSlots = await getAvailableTimeSlots(
        supabase,
        state.data.doctorId!,
        parsedDate
      );
      console.log('Available time slots:', availableSlots);

      if (availableSlots.length === 0) {
        return {
          text: `I'm sorry, but Dr. ${state.data.doctorName} doesn't have any available appointments on ${formatDate(parsedDate)}. Would you like to try a different date?`,
          shouldTransfer: false,
          conversationState: { ...state, step: 'date', attempts: 0 },
          nextAction: 'gather_speech'
        };
      }

      state.data.availableSlots = availableSlots;
      const timeSlots = availableSlots.slice(0, 5).map(formatTime).join(', ');
      const moreSlots = availableSlots.length > 5 ? ` and ${availableSlots.length - 5} more times` : '';

      return {
        text: `Perfect! Dr. ${state.data.doctorName} has these available times on ${formatDate(parsedDate)}: ${timeSlots}${moreSlots}. Which time works best for you?`,
        shouldTransfer: false,
        conversationState: state,
        nextAction: 'gather_speech'
      };

    case 'time':
      console.log('Processing time selection...');
      const availableSlots = state.data.availableSlots || [];
      console.log('Available time slots:', availableSlots);
      
      const matchedTime = findBestTimeMatch(input, availableSlots);
      console.log('Matched time:', matchedTime);

      if (!matchedTime) {
        state.attempts++;
        if (state.attempts >= 3) {
          return {
            text: "I'm having trouble understanding which time you'd prefer. Let me transfer you to our staff.",
            shouldTransfer: true,
            conversationState: state
          };
        }

        const timeList = availableSlots.slice(0, 5).map(formatTime).join(', ');
        return {
          text: `I didn't catch which time you'd like. Available times include: ${timeList}. Which time would you prefer?`,
          shouldTransfer: false,
          conversationState: state,
          nextAction: 'gather_speech'
        };
      }

      state.data.appointmentTime = matchedTime;
      state.step = 'confirmation';
      state.attempts = 0;

      return {
        text: `Perfect! Let me confirm your appointment details: ${state.data.patientName} with Dr. ${state.data.doctorName} in ${state.data.departmentName} on ${formatDate(state.data.appointmentDate!)} at ${formatTime(matchedTime)}. Should I go ahead and book this appointment for you?`,
        shouldTransfer: false,
        conversationState: state,
        nextAction: 'gather_speech'
      };

    case 'confirmation':
      console.log('Processing confirmation...');
      if (input.includes('yes') || input.includes('confirm') || input.includes('book') || 
          input.includes('schedule') || input.includes('okay') || input.includes('sure') ||
          input.includes('correct') || input.includes('right')) {
        
        // Double-check availability before booking
        const finalAvailabilityCheck = await checkTimeSlotAvailability(
          supabase,
          state.data.doctorId!,
          state.data.appointmentDate!,
          state.data.appointmentTime!
        );

        if (!finalAvailabilityCheck.available) {
          return {
            text: `I'm sorry, but that time slot was just booked by someone else. Let me check for other available times on ${formatDate(state.data.appointmentDate!)}. Please hold on.`,
            shouldTransfer: false,
            conversationState: { ...state, step: 'time', attempts: 0 },
            nextAction: 'gather_speech'
          };
        }

        // Book the appointment
        console.log('Booking appointment...');
        const appointmentResult = await bookAppointment(supabase, {
          clinic_id: context.clinicId,
          department_id: state.data.departmentId!,
          doctor_id: state.data.doctorId!,
          patient_name: state.data.patientName!,
          phone_number: state.data.patientPhone || context.callerPhone,
          email: state.data.patientEmail,
          appointment_date: state.data.appointmentDate!,
          appointment_time: state.data.appointmentTime!,
          status: 'pending',
          notes: `Booked via AI voice agent on ${new Date().toISOString()}`
        });

        console.log('Appointment booking result:', appointmentResult);

        if (!appointmentResult.success) {
          console.error('Appointment booking error:', appointmentResult.error);
          return {
            text: "I'm sorry, there was an error booking your appointment. Let me transfer you to our staff who can help you complete the booking.",
            shouldTransfer: true,
            conversationState: state
          };
        }

        state.step = 'complete';
        return {
          text: `Excellent! Your appointment has been successfully booked. Here are your details: ${state.data.patientName} with Dr. ${state.data.doctorName} in ${state.data.departmentName} on ${formatDate(state.data.appointmentDate!)} at ${formatTime(state.data.appointmentTime!)}. Your appointment ID is ${appointmentResult.appointment.id}. ${state.data.registrationComplete ? 'You are now registered as a patient with us. ' : ''}Is there anything else I can help you with today?`,
          shouldTransfer: false,
          conversationState: state,
          appointmentData: {
            ...appointmentResult.appointment,
            doctor_name: state.data.doctorName,
            department_name: state.data.departmentName
          },
          nextAction: 'gather_speech'
        };
      } else if (input.includes('no') || input.includes('cancel') || input.includes('change') ||
                 input.includes('different') || input.includes('wrong')) {
        return {
          text: "No problem! Would you like to choose a different date or time, or would you prefer to speak with our staff?",
          shouldTransfer: false,
          conversationState: { ...state, step: 'date', attempts: 0 },
          nextAction: 'gather_speech'
        };
      } else {
        state.attempts++;
        if (state.attempts >= 2) {
          return {
            text: "I want to make sure I understand correctly. Should I book this appointment for you? Please say 'yes' to confirm or 'no' to make changes.",
            shouldTransfer: false,
            conversationState: state,
            nextAction: 'gather_speech'
          };
        }
        return {
          text: "I didn't catch that. Should I go ahead and book this appointment? Please say 'yes' to confirm or 'no' if you'd like to make changes.",
          shouldTransfer: false,
          conversationState: state,
          nextAction: 'gather_speech'
        };
      }

    case 'complete':
      if (input.includes('no') || input.includes('nothing') || input.includes('that\'s all') ||
          input.includes('goodbye') || input.includes('thank you')) {
        return {
          text: `Perfect! Thank you for choosing ${clinic.name}, and we look forward to seeing you for your appointment. Have a great day!`,
          shouldHangup: true,
          conversationState: state
        };
      } else {
        return {
          text: "I'd be happy to help with anything else, but for additional requests, let me transfer you to our staff who can assist you further.",
          shouldTransfer: true,
          conversationState: state
        };
      }

    default:
      return {
        text: "I'm sorry, I'm having trouble with our conversation. Let me transfer you to our staff who can help you.",
        shouldTransfer: true,
        conversationState: state
      };
  }
}

// Enhanced database operations
async function fetchDepartments(supabase: any, clinicId: string): Promise<Department[]> {
  try {
    console.log('Fetching departments for clinic ID:', clinicId);
    const { data, error } = await supabase
      .from('departments')
      .select('id, name, description, is_active')
      .eq('clinic_id', clinicId)
      .eq('is_active', true)
      .order('name');

    if (error) {
      console.error('Error fetching departments:', error);
      throw error;
    }
    
    console.log('Departments fetched successfully:', data?.length || 0, 'departments');
    return data || [];
  } catch (error) {
    console.error('Error fetching departments:', error);
    return [];
  }
}

async function fetchDoctorsByDepartment(supabase: any, clinicId: string, departmentId: string): Promise<Doctor[]> {
  try {
    console.log('Fetching doctors for clinic ID:', clinicId, 'department ID:', departmentId);
    const { data, error } = await supabase
      .from('doctors')
      .select('id, name, department_id, specialization, available_days, available_times, is_active')
      .eq('clinic_id', clinicId)
      .eq('department_id', departmentId)
      .eq('is_active', true)
      .order('name');

    if (error) {
      console.error('Error fetching doctors:', error);
      throw error;
    }
    
    console.log('Doctors fetched successfully:', data?.length || 0, 'doctors');
    return data || [];
  } catch (error) {
    console.error('Error fetching doctors:', error);
    return [];
  }
}

async function registerPatient(supabase: any, patientData: any): Promise<{ success: boolean; patient?: any; error?: string }> {
  try {
    console.log('Registering patient:', patientData.name);
    // For now, we'll just return success with mock data
    // In a real implementation, you'd create a patient record
    const patient = {
      id: `patient_${Date.now()}`,
      name: patientData.name,
      phone: patientData.phone,
      email: patientData.email,
      dateOfBirth: patientData.dateOfBirth,
      clinicId: patientData.clinicId
    };

    console.log('Patient registered successfully:', patient.id);
    return { success: true, patient };
  } catch (error) {
    console.error('Error registering patient:', error);
    return { success: false, error: error.message };
  }
}

async function checkTimeSlotAvailability(
  supabase: any,
  doctorId: string,
  date: string,
  time: string
): Promise<{ available: boolean; reason?: string }> {
  try {
    console.log('Checking availability for doctor:', doctorId, 'date:', date, 'time:', time);
    const { data: existingAppointments, error } = await supabase
      .from('appointments')
      .select('id, status')
      .eq('doctor_id', doctorId)
      .eq('appointment_date', date)
      .eq('appointment_time', time)
      .in('status', ['pending', 'confirmed']);

    if (error) throw error;

    const isAvailable = !existingAppointments || existingAppointments.length === 0;
    console.log('Time slot availability:', isAvailable);

    if (!isAvailable) {
      return { available: false, reason: 'Time slot already booked' };
    }

    return { available: true };
  } catch (error) {
    console.error('Error checking availability:', error);
    return { available: false, reason: 'Error checking availability' };
  }
}

async function bookAppointment(supabase: any, appointmentData: any): Promise<{ success: boolean; appointment?: any; error?: string }> {
  try {
    console.log('Booking appointment with data:', appointmentData);
    const { data, error } = await supabase
      .from('appointments')
      .insert([appointmentData])
      .select()
      .single();

    if (error) {
      console.error('Error booking appointment:', error);
      throw error;
    }

    console.log('Appointment booked successfully:', data.id);
    return { success: true, appointment: data };
  } catch (error) {
    console.error('Error booking appointment:', error);
    return { success: false, error: error.message };
  }
}

async function getAvailableTimeSlots(supabase: any, doctorId: string, date: string): Promise<string[]> {
  try {
    console.log('Getting available time slots for doctor:', doctorId, 'date:', date);
    
    // Get doctor's available times and days
    const { data: doctor, error: doctorError } = await supabase
      .from('doctors')
      .select('available_times, available_days')
      .eq('id', doctorId)
      .single();

    if (doctorError) {
      console.error('Error fetching doctor:', doctorError);
      throw doctorError;
    }

    console.log('Doctor availability:', {
      available_days: doctor?.available_days,
      available_times: doctor?.available_times
    });

    // Check if the doctor is available on this day
    const dayOfWeek = new Date(date).toLocaleDateString('en-US', { weekday: 'long' });
    console.log('Requested day of week:', dayOfWeek);
    
    if (!doctor?.available_days?.includes(dayOfWeek)) {
      console.log('Doctor not available on', dayOfWeek);
      return [];
    }

    // Get existing appointments for this doctor on this date
    const { data: appointments, error: appointmentsError } = await supabase
      .from('appointments')
      .select('appointment_time')
      .eq('doctor_id', doctorId)
      .eq('appointment_date', date)
      .in('status', ['pending', 'confirmed']);

    if (appointmentsError) {
      console.error('Error fetching appointments:', appointmentsError);
      throw appointmentsError;
    }

    console.log('Existing appointments:', appointments?.map(a => a.appointment_time) || []);

    // Filter out booked time slots
    const bookedTimes = appointments?.map((apt: any) => apt.appointment_time) || [];
    const availableSlots = (doctor.available_times || []).filter((time: string) => !bookedTimes.includes(time));

    console.log('Available time slots:', availableSlots);
    return availableSlots.sort();
  } catch (error) {
    console.error('Error fetching available time slots:', error);
    return [];
  }
}

async function updateCallLog(supabase: any, context: any, state: ConversationState, appointmentData?: any, patientData?: any) {
  try {
    const callLogData = {
      clinic_id: context.clinicId,
      call_sid: context.callSid,
      caller_phone: context.callerPhone,
      call_duration: 0, // Will be updated by Twilio webhook
      call_summary: generateCallSummary(state, appointmentData, patientData),
      appointment_booked: !!appointmentData,
      created_at: new Date().toISOString()
    };

    // Check if call log already exists
    const { data: existingLog } = await supabase
      .from('call_logs')
      .select('id')
      .eq('call_sid', context.callSid)
      .single();

    if (existingLog) {
      // Update existing log
      await supabase
        .from('call_logs')
        .update({
          call_summary: callLogData.call_summary,
          appointment_booked: callLogData.appointment_booked
        })
        .eq('call_sid', context.callSid);
    } else {
      // Create new log
      await supabase
        .from('call_logs')
        .insert([callLogData]);
    }
  } catch (error) {
    console.error('Error updating call log:', error);
  }
}

async function logConversation(
  supabase: any,
  context: any,
  userInput: string,
  agentResponse: string,
  step: string,
  conversationData: any
) {
  try {
    await supabase
      .from('conversation_logs')
      .insert([{
        clinic_id: context.clinicId,
        call_sid: context.callSid,
        caller_phone: context.callerPhone,
        conversation_step: step,
        user_input: userInput,
        agent_response: agentResponse,
        created_at: new Date().toISOString()
      }]);
  } catch (error) {
    console.error('Error logging conversation:', error);
  }
}

// Helper functions
function generateCallSummary(state: ConversationState, appointmentData?: any, patientData?: any): string {
  if (appointmentData) {
    return `Appointment successfully booked for ${state.data.patientName} with Dr. ${state.data.doctorName} in ${state.data.departmentName} on ${state.data.appointmentDate} at ${state.data.appointmentTime}${patientData ? ' (new patient registered)' : ''}`;
  } else if (patientData) {
    return `Patient ${state.data.patientName} successfully registered but appointment booking incomplete`;
  } else if (state.step === 'transfer') {
    return `Call transferred to human staff during ${state.step} step`;
  } else {
    return `Call ended at ${state.step} step without completing registration or booking`;
  }
}

// Enhanced name extraction with better parsing
function extractName(input: string): string {
  console.log('Extracting name from input:', input);
  
  // Remove common phrases and words
  const cleanInput = input
    .toLowerCase()
    .replace(/my name is/gi, '')
    .replace(/i'm/gi, '')
    .replace(/im/gi, '')
    .replace(/this is/gi, '')
    .replace(/it's/gi, '')
    .replace(/its/gi, '')
    .replace(/call me/gi, '')
    .replace(/the name is/gi, '')
    .trim();

  // Split into words and filter out common words
  const words = cleanInput.split(/\s+/).filter(word => {
    const commonWords = ['my', 'name', 'is', 'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by'];
    return word.length > 1 && !commonWords.includes(word.toLowerCase());
  });

  // Take first two meaningful words as name
  const extractedName = words.slice(0, 2).join(' ');
  
  // Capitalize first letter of each word
  const formattedName = extractedName
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');

  console.log('Extracted and formatted name:', formattedName);
  return formattedName || input.trim();
}

// Enhanced phone number extraction
function extractPhoneNumber(input: string): string | null {
  console.log('Extracting phone number from input:', input);
  
  // Remove all non-digit characters except + and spaces for initial cleaning
  const cleaned = input.replace(/[^\d\+\s\-\(\)]/g, '');
  
  // Extract just digits
  const digits = cleaned.replace(/[^\d]/g, '');
  
  console.log('Extracted digits:', digits);
  
  // Check if we have a valid phone number (10-15 digits)
  if (digits.length >= 10 && digits.length <= 15) {
    let formattedNumber;
    
    if (digits.length === 10) {
      // US number without country code
      formattedNumber = `+1${digits}`;
    } else if (digits.length === 11 && digits.startsWith('1')) {
      // US number with country code
      formattedNumber = `+${digits}`;
    } else {
      // International number
      formattedNumber = `+${digits}`;
    }
    
    console.log('Formatted phone number:', formattedNumber);
    return formattedNumber;
  }
  
  console.log('Invalid phone number length:', digits.length);
  return null;
}

// Enhanced email extraction
function extractEmail(input: string): string | null {
  console.log('Extracting email from input:', input);
  
  // Standard email regex
  const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/;
  const match = input.match(emailRegex);
  
  if (match) {
    const email = match[0].toLowerCase();
    console.log('Found email via regex:', email);
    return email;
  }
  
  // Handle spelled out emails (e.g., "john at gmail dot com")
  const spokenEmail = input.toLowerCase()
    .replace(/\s+at\s+/g, '@')
    .replace(/\s+dot\s+/g, '.')
    .replace(/\s+/g, '');
  
  if (emailRegex.test(spokenEmail)) {
    console.log('Found email via spoken format:', spokenEmail);
    return spokenEmail;
  }
  
  console.log('No valid email found');
  return null;
}

// Enhanced fuzzy matching with better similarity scoring
function findBestMatch(input: string, items: any[], field: string): any {
  console.log('Finding best match for input:', input, 'in field:', field);
  console.log('Available items:', items.map(item => item[field]));
  
  const inputLower = input.toLowerCase().trim();
  
  // Exact match (highest priority)
  for (const item of items) {
    if (item[field].toLowerCase() === inputLower) {
      console.log('Found exact match:', item[field]);
      return item;
    }
  }
  
  // Partial match - input contains item name or vice versa
  for (const item of items) {
    const itemName = item[field].toLowerCase();
    if (itemName.includes(inputLower) || inputLower.includes(itemName)) {
      console.log('Found partial match:', item[field]);
      return item;
    }
  }
  
  // Word-by-word match
  const inputWords = inputLower.split(/\s+/);
  for (const item of items) {
    const itemWords = item[field].toLowerCase().split(/\s+/);
    for (const inputWord of inputWords) {
      for (const itemWord of itemWords) {
        if (inputWord === itemWord && inputWord.length > 2) {
          console.log('Found word match:', item[field], 'via word:', inputWord);
          return item;
        }
      }
    }
  }
  
  // Fuzzy match using Levenshtein distance for close matches
  let bestMatch = null;
  let bestScore = 0;
  
  for (const item of items) {
    const itemName = item[field].toLowerCase();
    const similarity = calculateSimilarity(inputLower, itemName);
    
    if (similarity > 0.6 && similarity > bestScore) { // 60% similarity threshold
      bestScore = similarity;
      bestMatch = item;
    }
  }
  
  if (bestMatch) {
    console.log('Found fuzzy match:', bestMatch[field], 'with similarity:', bestScore);
    return bestMatch;
  }
  
  console.log('No match found');
  return null;
}

// Calculate string similarity using Levenshtein distance
function calculateSimilarity(str1: string, str2: string): number {
  const len1 = str1.length;
  const len2 = str2.length;
  
  if (len1 === 0) return len2 === 0 ? 1 : 0;
  if (len2 === 0) return 0;
  
  const matrix = Array(len2 + 1).fill(null).map(() => Array(len1 + 1).fill(null));
  
  for (let i = 0; i <= len1; i++) matrix[0][i] = i;
  for (let j = 0; j <= len2; j++) matrix[j][0] = j;
  
  for (let j = 1; j <= len2; j++) {
    for (let i = 1; i <= len1; i++) {
      const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
      matrix[j][i] = Math.min(
        matrix[j - 1][i] + 1,     // deletion
        matrix[j][i - 1] + 1,     // insertion
        matrix[j - 1][i - 1] + cost // substitution
      );
    }
  }
  
  const maxLen = Math.max(len1, len2);
  return (maxLen - matrix[len2][len1]) / maxLen;
}

// Enhanced time matching with better natural language processing
function findBestTimeMatch(input: string, availableSlots: string[]): string | null {
  console.log('Finding best time match for input:', input);
  console.log('Available slots:', availableSlots);
  
  const inputLower = input.toLowerCase().trim();
  
  // Enhanced time parsing patterns
  const timePatterns = [
    /(\d{1,2})[:\s](\d{2})/,           // "2:30", "14:30", "2 30"
    /(\d{1,2})\s*(am|pm)/,             // "2pm", "10 am"
    /(\d{1,2})[:\s](\d{2})\s*(am|pm)/, // "2:30pm", "10:15 am"
    /(\d{1,2})\s*o'?clock/,            // "2 oclock", "3 o'clock"
  ];
  
  for (const pattern of timePatterns) {
    const match = inputLower.match(pattern);
    if (match) {
      let hour = parseInt(match[1]);
      let minute = 0;
      
      if (match[2] && !isNaN(parseInt(match[2]))) {
        minute = parseInt(match[2]);
      }
      
      // Handle AM/PM
      const ampm = match[3] || (inputLower.includes('pm') ? 'pm' : inputLower.includes('am') ? 'am' : null);
      
      if (ampm === 'pm' && hour < 12) {
        hour += 12;
      } else if (ampm === 'am' && hour === 12) {
        hour = 0;
      }
      
      const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
      console.log('Parsed time string:', timeString);
      
      // Find exact match
      if (availableSlots.includes(timeString)) {
        console.log('Found exact time match:', timeString);
        return timeString;
      }
      
      // Find closest match within 30 minutes
      const targetMinutes = hour * 60 + minute;
      let closestSlot = null;
      let closestDiff = Infinity;
      
      for (const slot of availableSlots) {
        const [slotHour, slotMinute] = slot.split(':').map(Number);
        const slotMinutes = slotHour * 60 + slotMinute;
        const diff = Math.abs(targetMinutes - slotMinutes);
        
        if (diff < closestDiff && diff <= 30) { // Within 30 minutes
          closestDiff = diff;
          closestSlot = slot;
        }
      }
      
      if (closestSlot) {
        console.log('Found closest time match:', closestSlot, 'with difference:', closestDiff, 'minutes');
        return closestSlot;
      }
    }
  }
  
  // Handle relative time expressions
  const relativeTimeMap = {
    'morning': (slots: string[]) => slots.find(slot => {
      const hour = parseInt(slot.split(':')[0]);
      return hour >= 8 && hour < 12;
    }),
    'afternoon': (slots: string[]) => slots.find(slot => {
      const hour = parseInt(slot.split(':')[0]);
      return hour >= 12 && hour < 17;
    }),
    'evening': (slots: string[]) => slots.find(slot => {
      const hour = parseInt(slot.split(':')[0]);
      return hour >= 17 && hour < 21;
    }),
    'noon': (slots: string[]) => slots.find(slot => slot.startsWith('12:')),
    'midnight': (slots: string[]) => slots.find(slot => slot.startsWith('00:')),
  };
  
  for (const [timePhrase, finder] of Object.entries(relativeTimeMap)) {
    if (inputLower.includes(timePhrase)) {
      const match = finder(availableSlots);
      if (match) {
        console.log('Found relative time match:', match, 'for phrase:', timePhrase);
        return match;
      }
    }
  }
  
  // Try fuzzy matching with available slots
  for (const slot of availableSlots) {
    const formattedSlot = formatTime(slot).toLowerCase();
    if (inputLower.includes(slot) || formattedSlot.includes(inputLower) || 
        calculateSimilarity(inputLower, formattedSlot) > 0.7) {
      console.log('Found fuzzy time match:', slot);
      return slot;
    }
  }
  
  console.log('No time match found');
  return null;
}

// Enhanced date parsing with comprehensive natural language support
function parseDate(input: string): string | null {
  console.log('Parsing date from input:', input);
  
  const inputLower = input.toLowerCase().trim();
  const today = new Date();
  
  // Handle relative dates
  const relativeDates = {
    'today': () => {
      const date = new Date(today);
      return date.toISOString().split('T')[0];
    },
    'tomorrow': () => {
      const date = new Date(today);
      date.setDate(date.getDate() + 1);
      return date.toISOString().split('T')[0];
    },
    'day after tomorrow': () => {
      const date = new Date(today);
      date.setDate(date.getDate() + 2);
      return date.toISOString().split('T')[0];
    },
    'next week': () => {
      const date = new Date(today);
      date.setDate(date.getDate() + 7);
      return date.toISOString().split('T')[0];
    },
    'in a week': () => {
      const date = new Date(today);
      date.setDate(date.getDate() + 7);
      return date.toISOString().split('T')[0];
    },
  };
  
  for (const [phrase, dateFunc] of Object.entries(relativeDates)) {
    if (inputLower.includes(phrase)) {
      const result = dateFunc();
      console.log('Found relative date:', result, 'for phrase:', phrase);
      return result;
    }
  }
  
  // Handle "in X days" pattern
  const inDaysMatch = inputLower.match(/in\s+(\d+)\s+days?/);
  if (inDaysMatch) {
    const days = parseInt(inDaysMatch[1]);
    const date = new Date(today);
    date.setDate(date.getDate() + days);
    const result = date.toISOString().split('T')[0];
    console.log('Found "in X days" date:', result);
    return result;
  }
  
  // Handle day names with "next" or "this"
  const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const dayAbbreviations = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
  
  for (let i = 0; i < days.length; i++) {
    const fullDay = days[i];
    const abbrevDay = dayAbbreviations[i];
    
    if (inputLower.includes(fullDay) || inputLower.includes(abbrevDay)) {
      const targetDay = new Date(today);
      const currentDay = today.getDay();
      let daysToAdd = i - currentDay;
      
      // If the day has passed this week, go to next week
      if (daysToAdd <= 0) {
        daysToAdd += 7;
      }
      
      // Handle "next" explicitly
      if (inputLower.includes('next')) {
        daysToAdd += 7;
      }
      
      targetDay.setDate(today.getDate() + daysToAdd);
      const result = targetDay.toISOString().split('T')[0];
      console.log('Found day name date:', result, 'for day:', fullDay);
      return result;
    }
  }
  
  // Handle month names with dates
  const months = [
    'january', 'february', 'march', 'april', 'may', 'june',
    'july', 'august', 'september', 'october', 'november', 'december'
  ];
  const monthAbbreviations = [
    'jan', 'feb', 'mar', 'apr', 'may', 'jun',
    'jul', 'aug', 'sep', 'oct', 'nov', 'dec'
  ];
  
  for (let i = 0; i < months.length; i++) {
    const fullMonth = months[i];
    const abbrevMonth = monthAbbreviations[i];
    
    if (inputLower.includes(fullMonth) || inputLower.includes(abbrevMonth)) {
      // Look for day number
      const dayMatches = input.match(/(\d{1,2})(st|nd|rd|th)?/g);
      if (dayMatches) {
        for (const dayMatch of dayMatches) {
          const day = parseInt(dayMatch.replace(/[^\d]/g, ''));
          if (day >= 1 && day <= 31) {
            let year = today.getFullYear();
            const date = new Date(year, i, day);
            
            // If the date is in the past, assume next year
            if (date < today) {
              year += 1;
              date.setFullYear(year);
            }
            
            const result = date.toISOString().split('T')[0];
            console.log('Found month/day date:', result, 'for month:', fullMonth, 'day:', day);
            return result;
          }
        }
      }
    }
  }
  
  // Handle various date formats
  const dateFormats = [
    /(\d{1,2})\/(\d{1,2})\/(\d{4})/,     // MM/DD/YYYY
    /(\d{1,2})-(\d{1,2})-(\d{4})/,      // MM-DD-YYYY
    /(\d{4})-(\d{1,2})-(\d{1,2})/,      // YYYY-MM-DD
    /(\d{1,2})\/(\d{1,2})\/(\d{2})/,    // MM/DD/YY
    /(\d{1,2})-(\d{1,2})-(\d{2})/,      // MM-DD-YY
  ];
  
  for (const format of dateFormats) {
    const match = input.match(format);
    if (match) {
      let year, month, day;
      
      if (format === dateFormats[2]) { // YYYY-MM-DD
        [, year, month, day] = match;
      } else if (format === dateFormats[3] || format === dateFormats[4]) { // YY formats
        [, month, day, year] = match;
        year = parseInt(year) + (parseInt(year) < 50 ? 2000 : 1900); // Y2K handling
      } else { // MM/DD/YYYY or MM-DD-YYYY
        [, month, day, year] = match;
      }
      
      const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
      const result = date.toISOString().split('T')[0];
      console.log('Found formatted date:', result);
      return result;
    }
  }
  
  console.log('No valid date found');
  return null;
}

function validateAppointmentDate(dateString: string): { isValid: boolean; message?: string } {
  const today = new Date();
  const requestedDate = new Date(dateString);
  const maxDate = new Date();
  maxDate.setMonth(maxDate.getMonth() + 3); // 3 months ahead

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

  // Check if it's a weekend (assuming clinic is closed on weekends)
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