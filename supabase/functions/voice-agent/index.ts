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
  };
  attempts: number;
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
      attempts: 0
    };

    // Get clinic information
    const { data: clinic } = await supabase
      .from('clinics')
      .select('name, phone')
      .eq('id', context.clinicId)
      .single();

    // Process user input and determine response
    const response = await processConversation(
      userInput,
      conversationState,
      context,
      supabase,
      clinic
    );

    // Log the conversation step
    await logConversation(supabase, context, userInput, response.text, conversationState.step);

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
      input.includes('representative') || input.includes('transfer')) {
    return {
      text: "Of course! Let me transfer you to one of our staff members who can assist you further. Please hold on.",
      shouldTransfer: true,
      conversationState: { ...state, step: 'transfer' }
    };
  }

  switch (state.step) {
    case 'greeting':
      state.step = 'name';
      state.attempts = 0;
      return {
        text: `Hello! Thank you for calling ${clinic?.name || 'our clinic'}. I'm your AI assistant, and I'm here to help you schedule an appointment. May I please have your name?`,
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
          text: "I didn't catch that. Could you please tell me your name again?",
          shouldTransfer: false,
          conversationState: state,
          nextAction: 'gather_speech'
        };
      }

      // Extract name from input
      const name = extractName(userInput);
      state.data.patientName = name;
      state.step = 'department';
      state.attempts = 0;

      // Get available departments
      const { data: departments } = await supabase
        .from('departments')
        .select('id, name, description')
        .eq('clinic_id', context.clinicId)
        .eq('is_active', true)
        .order('name');

      if (!departments || departments.length === 0) {
        return {
          text: "I'm sorry, but I'm having trouble accessing our department information. Let me transfer you to our staff.",
          shouldTransfer: true,
          conversationState: state
        };
      }

      const departmentsList = departments
        .map((dept: any) => dept.name)
        .join(', ');

      return {
        text: `Nice to meet you, ${name}! We have the following departments available: ${departmentsList}. Which department would you like to schedule an appointment with?`,
        shouldTransfer: false,
        conversationState: state,
        nextAction: 'gather_speech'
      };

    case 'department':
      // Get departments again for matching
      const { data: depts } = await supabase
        .from('departments')
        .select('id, name')
        .eq('clinic_id', context.clinicId)
        .eq('is_active', true);

      const matchedDept = findBestMatch(input, depts, 'name');
      
      if (!matchedDept) {
        state.attempts++;
        if (state.attempts >= 3) {
          return {
            text: "I'm having trouble understanding which department you'd like. Let me transfer you to our staff who can help you better.",
            shouldTransfer: true,
            conversationState: state
          };
        }
        
        const deptList = depts.map((d: any) => d.name).join(', ');
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

      // Get available doctors for the selected department
      const { data: doctors } = await supabase
        .from('doctors')
        .select('id, name, specialization, available_days, available_times')
        .eq('clinic_id', context.clinicId)
        .eq('department_id', matchedDept.id)
        .eq('is_active', true)
        .order('name');

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
          text: `Perfect! For ${matchedDept.name}, we have Dr. ${doctors[0].name} available. What date would you like to schedule your appointment? Please say the date like 'January 15th' or 'next Monday'.`,
          shouldTransfer: false,
          conversationState: state,
          nextAction: 'gather_speech'
        };
      } else {
        const doctorsList = doctors
          .map((doc: any) => `Dr. ${doc.name}`)
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

        const docList = availableDoctors.map((d: any) => `Dr. ${d.name}`).join(', ');
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
        text: `Excellent! I'll schedule you with Dr. ${matchedDoctor.name}. What date would you like for your appointment? Please say the date like 'January 15th' or 'next Monday'.`,
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
          text: "I didn't catch the date. Could you please say the date again? For example, 'January 15th' or 'next Monday'.",
          shouldTransfer: false,
          conversationState: state,
          nextAction: 'gather_speech'
        };
      }

      // Check if the date is valid (not in the past, not too far in future)
      const today = new Date();
      const requestedDate = new Date(parsedDate);
      const maxDate = new Date();
      maxDate.setMonth(maxDate.getMonth() + 3); // 3 months ahead

      if (requestedDate < today) {
        return {
          text: "I'm sorry, but that date has already passed. Could you please choose a future date?",
          shouldTransfer: false,
          conversationState: state,
          nextAction: 'gather_speech'
        };
      }

      if (requestedDate > maxDate) {
        return {
          text: "I can only schedule appointments up to 3 months in advance. Could you please choose an earlier date?",
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
      const timeSlots = availableSlots.slice(0, 5).join(', '); // Show first 5 slots
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
        text: `Perfect! Let me confirm your appointment details: ${state.data.patientName} with Dr. ${state.data.doctorName} in ${state.data.departmentName} on ${formatDate(state.data.appointmentDate!)} at ${matchedTime}. Should I go ahead and book this appointment for you?`,
        shouldTransfer: false,
        conversationState: state,
        nextAction: 'gather_speech'
      };

    case 'confirmation':
      if (input.includes('yes') || input.includes('confirm') || input.includes('book') || 
          input.includes('schedule') || input.includes('okay') || input.includes('sure')) {
        
        // Book the appointment
        const { data: appointment, error } = await supabase
          .from('appointments')
          .insert([{
            clinic_id: context.clinicId,
            department_id: state.data.departmentId,
            doctor_id: state.data.doctorId,
            patient_name: state.data.patientName,
            phone_number: context.callerPhone,
            appointment_date: state.data.appointmentDate,
            appointment_time: state.data.appointmentTime,
            status: 'pending',
            notes: 'Booked via AI voice agent'
          }])
          .select()
          .single();

        if (error) {
          console.error('Appointment booking error:', error);
          return {
            text: "I'm sorry, there was an error booking your appointment. Let me transfer you to our staff who can help you complete the booking.",
            shouldTransfer: true,
            conversationState: state
          };
        }

        // Log successful booking
        await supabase
          .from('call_logs')
          .insert([{
            clinic_id: context.clinicId,
            caller_phone: context.callerPhone,
            call_duration: 0, // Will be updated by Twilio webhook
            call_summary: `Appointment booked for ${state.data.patientName} with Dr. ${state.data.doctorName}`,
            appointment_booked: true
          }]);

        state.step = 'complete';
        return {
          text: `Excellent! Your appointment has been successfully booked. Here are your details: ${state.data.patientName} with Dr. ${state.data.doctorName} on ${formatDate(state.data.appointmentDate!)} at ${state.data.appointmentTime}. Your appointment ID is ${appointment.id}. You'll receive a confirmation call or message shortly. Is there anything else I can help you with today?`,
          shouldTransfer: false,
          conversationState: state,
          appointmentData: appointment,
          nextAction: 'gather_speech'
        };
      } else if (input.includes('no') || input.includes('cancel') || input.includes('change')) {
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
      if (input.includes('no') || input.includes('nothing') || input.includes('that\'s all')) {
        return {
          text: "Perfect! Thank you for calling, and we look forward to seeing you for your appointment. Have a great day!",
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

// Helper functions
function extractName(input: string): string {
  // Simple name extraction - in production, use more sophisticated NLP
  const words = input.split(' ').filter(word => word.length > 1);
  const commonWords = ['my', 'name', 'is', 'i\'m', 'im', 'this', 'it\'s', 'its', 'the', 'a', 'an'];
  const nameWords = words.filter(word => !commonWords.includes(word.toLowerCase()));
  return nameWords.slice(0, 2).join(' ') || input.trim();
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

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
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

async function logConversation(
  supabase: any,
  context: any,
  userInput: string,
  agentResponse: string,
  step: string
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