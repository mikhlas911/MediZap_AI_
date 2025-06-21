import { supabase } from '../lib/supabase';
import type { Appointment, Doctor, Department } from '../lib/supabase';

export interface AppointmentBooking {
  clinicId: string;
  departmentId: string;
  doctorId: string;
  patientName: string;
  patientPhone: string;
  appointmentDate: string;
  appointmentTime: string;
  notes?: string;
}

export class AppointmentService {
  async bookAppointment(booking: AppointmentBooking): Promise<Appointment> {
    try {
      // Check if the time slot is available
      const { data: existingAppointments, error: checkError } = await supabase
        .from('appointments')
        .select('*')
        .eq('doctor_id', booking.doctorId)
        .eq('appointment_date', booking.appointmentDate)
        .eq('appointment_time', booking.appointmentTime)
        .eq('status', 'scheduled');

      if (checkError) throw checkError;

      if (existingAppointments && existingAppointments.length > 0) {
        throw new Error('This time slot is already booked');
      }

      // Create the appointment
      const { data, error } = await supabase
        .from('appointments')
        .insert([booking])
        .select()
        .single();

      if (error) throw error;

      return data;
    } catch (error) {
      console.error('Error booking appointment:', error);
      throw error;
    }
  }

  async getAvailableDoctors(clinicId: string, departmentId?: string): Promise<Doctor[]> {
    try {
      let query = supabase
        .from('doctors')
        .select('*')
        .eq('clinic_id', clinicId);

      if (departmentId) {
        query = query.eq('department_id', departmentId);
      }

      const { data, error } = await query.order('name');

      if (error) throw error;

      return data || [];
    } catch (error) {
      console.error('Error fetching doctors:', error);
      throw error;
    }
  }

  async getDepartments(clinicId: string): Promise<Department[]> {
    try {
      const { data, error } = await supabase
        .from('departments')
        .select('*')
        .eq('clinic_id', clinicId)
        .order('name');

      if (error) throw error;

      return data || [];
    } catch (error) {
      console.error('Error fetching departments:', error);
      throw error;
    }
  }

  async getAvailableTimeSlots(doctorId: string, date: string): Promise<string[]> {
    try {
      // Get doctor's available times
      const { data: doctor, error: doctorError } = await supabase
        .from('doctors')
        .select('available_times, available_days')
        .eq('id', doctorId)
        .single();

      if (doctorError) throw doctorError;

      // Check if the doctor is available on this day
      const dayOfWeek = new Date(date).toLocaleDateString('en-US', { weekday: 'long' });
      if (!doctor?.available_days.includes(dayOfWeek)) {
        return [];
      }

      // Get existing appointments for this doctor on this date
      const { data: appointments, error: appointmentsError } = await supabase
        .from('appointments')
        .select('appointment_time')
        .eq('doctor_id', doctorId)
        .eq('appointment_date', date)
        .eq('status', 'scheduled');

      if (appointmentsError) throw appointmentsError;

      // Filter out booked time slots
      const bookedTimes = appointments?.map(apt => apt.appointment_time) || [];
      const availableSlots = doctor.available_times.filter(time => !bookedTimes.includes(time));

      return availableSlots;
    } catch (error) {
      console.error('Error fetching available time slots:', error);
      throw error;
    }
  }
}

export const appointmentService = new AppointmentService();