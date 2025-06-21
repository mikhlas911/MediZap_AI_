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
  };
  config: {
    elevenLabsApiKey: string;
    elevenLabsVoiceId: string;
  };
}

interface ConversationState {
  step: 'greeting' | 'name' | 'department' | 'doctor' | 'date' | 'time' | 'confirmation' | 'complete' | 'transfer';
  data: {
    patientName?: string;
    departmentId?: string;
    departmentName?: string;
    doctorId?: string;
    doctorName?: string;
    appointmentDate?: string;
    appointmentTime?: string;
    availableDoctors?: any[];
    availableSlots?: string[];
    patientEmail?: string;
    appointmentNotes?: string;
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

interface Appointment {
  id: string;
  clinic_id: string;
  department_id: string;
  doctor_id: string;
  patient_name: string;
  phone_number: string;
  email?: string;
  appointment_date: string;
  appointment_time: string;
  status: string;
  notes?: string;
  created_at: string;
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

    // Initialize or get conversation state
    let conversationState: ConversationState = context.conversationState || {
      step: 'greeting',
      data: {},
      attempts: 0,
      lastActivity: new Date().toISOString()
    };

    // Update last activity
    conversationState.lastActivity = new Date().toISOString();

    // Get clinic information with enhanced data
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

    // Process user input and determine response
    const response = await processConversation(
      userInput,
      conversationState,
      context,
      supabase,
      clinic
    );

    // Log the conversation step with enhanced details
    await logConversation(supabase, context, userInput, response.text, conversationState.step, conversationState.data);

    // Create or update call log
    await updateCallLog(supabase, context, conversationState, response.appointmentData);

    return new Response(
      JSON.stringify({
        text: response.text,
        shouldTransfer: response.shouldTransfer,
        shouldHangup: response.shouldHangup,
        appointmentData: response.appointmentData,
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
      state.step = 'name';
      state.attempts = 0;
      return {
        text: `Hello! Thank you for calling ${clinic?.name || 'our clinic'}. I'm your AI assistant, and I'm here to help you schedule an appointment. May I please have your full name?`,
        shouldTransfer: false,
        conversationState: state,
        nextAction: 'gather_speech'
      };

    case 'name':
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

      // Extract and validate name
      const name = extractName(userInput);
      if (name.length < 2) {
        state.attempts++;
        return {
          text: "I need your full name to schedule the appointment. Could you please say your first and last name?",
          shouldTransfer: false,
          conversationState: state,
          nextAction: 'gather_speech'
        };
      }

      state.data.patientName = name;
      state.step = 'department';
      state.attempts = 0;

      // Fetch available departments with enhanced error handling
      const departments = await fetchDepartments(supabase, context.clinicId);
      
      if (!departments || departments.length === 0) {
        return {
          text: "I'm sorry, but I'm having trouble accessing our department information. Let me transfer you to our staff who can help you schedule your appointment.",
          shouldTransfer: true,
          conversationState: state
        };
      }

      const departmentsList = departments
        .map((dept: Department) => dept.name)
        .join(', ');

      return {
        text: `Nice to meet you, ${name}! We have the following departments available: ${departmentsList}. Which department would you like to schedule an appointment with?`,
        shouldTransfer: false,
        conversationState: state,
        nextAction: 'gather_speech'
      };

    case 'department':
      const departments = await fetchDepartments(supabase, context.clinicId);
      const matchedDept = findBestMatch(input, departments, 'name');
      
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
      const doctors = await fetchDoctorsByDepartment(supabase, context.clinicId, matchedDept.id);

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
      const availableDoctors = state.data.availableDoctors || [];
      const matchedDoctor = findBestMatch(input, availableDoctors, 'name');

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
      const parsedDate = parseDate(userInput);
      
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
      const availableSlots = await getAvailableTimeSlots(
        supabase,
        state.data.doctorId!,
        parsedDate
      );

      if (availableSlots.length === 0) {
        return {
          text: `I'm sorry, but Dr. ${state.data.doctorName} doesn't have any available appointments on ${formatDate(parsedDate)}. Would you like to try a different date?`,
          shouldTransfer: false,
          conversationState: { ...state, step: 'date', attempts: 0 },
          nextAction: 'gather_speech'
        };
      }

      state.data.availableSlots = availableSlots;
      const timeSlots = availableSlots.slice(0, 5).join(', ');
      const moreSlots = availableSlots.length > 5 ? ` and ${availableSlots.length - 5} more times` : '';

      return {
        text: `Perfect! Dr. ${state.data.doctorName} has these available times on ${formatDate(parsedDate)}: ${timeSlots}${moreSlots}. Which time works best for you?`,
        shouldTransfer: false,
        conversationState: state,
        nextAction: 'gather_speech'
      };

    case 'time':
      const availableSlots = state.data.availableSlots || [];
      const matchedTime = findBestTimeMatch(input, availableSlots);

      if (!matchedTime) {
        state.attempts++;
        if (state.attempts >= 3) {
          return {
            text: "I'm having trouble understanding which time you'd prefer. Let me transfer you to our staff.",
            shouldTransfer: true,
            conversationState: state
          };
        }

        const timeList = availableSlots.slice(0, 5).join(', ');
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
        const appointmentResult = await bookAppointment(supabase, {
          clinic_id: context.clinicId,
          department_id: state.data.departmentId!,
          doctor_id: state.data.doctorId!,
          patient_name: state.data.patientName!,
          phone_number: context.callerPhone,
          appointment_date: state.data.appointmentDate!,
          appointment_time: state.data.appointmentTime!,
          status: 'pending',
          notes: `Booked via AI voice agent on ${new Date().toISOString()}`
        });

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
          text: `Excellent! Your appointment has been successfully booked. Here are your details: ${state.data.patientName} with Dr. ${state.data.doctorName} in ${state.data.departmentName} on ${formatDate(state.data.appointmentDate!)} at ${formatTime(state.data.appointmentTime!)}. Your appointment ID is ${appointmentResult.appointment.id}. You'll receive a confirmation shortly. Is there anything else I can help you with today?`,
          shouldTransfer: false,
          conversationState: state,
          appointmentData: appointmentResult.appointment,
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
          text: `Perfect! Thank you for calling ${clinic.name}, and we look forward to seeing you for your appointment. Have a great day!`,
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
    const { data, error } = await supabase
      .from('departments')
      .select('id, name, description, is_active')
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

async function fetchDoctorsByDepartment(supabase: any, clinicId: string, departmentId: string): Promise<Doctor[]> {
  try {
    const { data, error } = await supabase
      .from('doctors')
      .select('id, name, department_id, specialization, available_days, available_times, is_active')
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

async function checkTimeSlotAvailability(
  supabase: any,
  doctorId: string,
  date: string,
  time: string
): Promise<{ available: boolean; reason?: string }> {
  try {
    const { data: existingAppointments, error } = await supabase
      .from('appointments')
      .select('id, status')
      .eq('doctor_id', doctorId)
      .eq('appointment_date', date)
      .eq('appointment_time', time)
      .in('status', ['pending', 'confirmed']);

    if (error) throw error;

    if (existingAppointments && existingAppointments.length > 0) {
      return { available: false, reason: 'Time slot already booked' };
    }

    return { available: true };
  } catch (error) {
    console.error('Error checking availability:', error);
    return { available: false, reason: 'Error checking availability' };
  }
}

async function bookAppointment(supabase: any, appointmentData: any): Promise<{ success: boolean; appointment?: Appointment; error?: string }> {
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

async function getAvailableTimeSlots(supabase: any, doctorId: string, date: string): Promise<string[]> {
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

async function updateCallLog(supabase: any, context: any, state: ConversationState, appointmentData?: any) {
  try {
    const callLogData = {
      clinic_id: context.clinicId,
      call_sid: context.callSid,
      caller_phone: context.callerPhone,
      call_duration: 0, // Will be updated by Twilio webhook
      call_summary: generateCallSummary(state, appointmentData),
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
function generateCallSummary(state: ConversationState, appointmentData?: any): string {
  if (appointmentData) {
    return `Appointment successfully booked for ${state.data.patientName} with Dr. ${state.data.doctorName} in ${state.data.departmentName} on ${state.data.appointmentDate} at ${state.data.appointmentTime}`;
  } else if (state.step === 'transfer') {
    return `Call transferred to human staff during ${state.step} step`;
  } else {
    return `Call ended at ${state.step} step without booking appointment`;
  }
}

function extractName(input: string): string {
  // Enhanced name extraction
  const words = input.split(' ').filter(word => word.length > 1);
  const commonWords = ['my', 'name', 'is', 'i\'m', 'im', 'this', 'it\'s', 'its', 'the', 'a', 'an', 'call', 'me'];
  const nameWords = words.filter(word => !commonWords.includes(word.toLowerCase()));
  
  // Take first two meaningful words as name
  const extractedName = nameWords.slice(0, 2).join(' ');
  return extractedName || input.trim();
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
  
  // Direct time match (e.g., "2:30", "14:30", "2 30")
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
      
      if (diff < closestDiff && diff <= 30) { // Within 30 minutes
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
  
  if (inputLower.includes('evening')) {
    return availableSlots.find(slot => {
      const hour = parseInt(slot.split(':')[0]);
      return hour >= 17;
    }) || null;
  }
  
  // Try exact string match
  for (const slot of availableSlots) {
    if (inputLower.includes(slot) || slot.includes(inputLower)) {
      return slot;
    }
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
  
  if (inputLower.includes('next week')) {
    const nextWeek = new Date(today);
    nextWeek.setDate(nextWeek.getDate() + 7);
    return nextWeek.toISOString().split('T')[0];
  }
  
  // Handle day names
  const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  for (let i = 0; i < days.length; i++) {
    if (inputLower.includes(days[i])) {
      const targetDay = new Date(today);
      const currentDay = today.getDay();
      let daysToAdd = i - currentDay;
      
      if (daysToAdd <= 0) {
        daysToAdd += 7; // Next week
      }
      
      targetDay.setDate(today.getDate() + daysToAdd);
      return targetDay.toISOString().split('T')[0];
    }
  }
  
  // Handle month names and dates
  const months = [
    'january', 'february', 'march', 'april', 'may', 'june',
    'july', 'august', 'september', 'october', 'november', 'december'
  ];
  
  for (let i = 0; i < months.length; i++) {
    if (inputLower.includes(months[i])) {
      const dayMatch = inputLower.match(/(\d{1,2})/);
      if (dayMatch) {
        const day = parseInt(dayMatch[1]);
        const year = today.getFullYear();
        const date = new Date(year, i, day);
        
        // If the date is in the past, assume next year
        if (date < today) {
          date.setFullYear(year + 1);
        }
        
        return date.toISOString().split('T')[0];
      }
    }
  }
  
  // Try to parse various date formats
  const dateFormats = [
    /(\d{1,2})\/(\d{1,2})\/(\d{4})/,  // MM/DD/YYYY
    /(\d{1,2})-(\d{1,2})-(\d{4})/,   // MM-DD-YYYY
    /(\d{4})-(\d{1,2})-(\d{1,2})/,   // YYYY-MM-DD
  ];
  
  for (const format of dateFormats) {
    const match = input.match(format);
    if (match) {
      let year, month, day;
      
      if (format === dateFormats[2]) { // YYYY-MM-DD
        [, year, month, day] = match;
      } else { // MM/DD/YYYY or MM-DD-YYYY
        [, month, day, year] = match;
      }
      
      const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
      return date.toISOString().split('T')[0];
    }
  }
  
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