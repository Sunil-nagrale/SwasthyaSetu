import { apiClient } from './client';
import { Appointment, CreateAppointmentPayload } from '@/types';

export const appointmentsApi = {
  async createAppointment(payload: CreateAppointmentPayload): Promise<Appointment> {
    return apiClient<Appointment>('/appointments', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async listPatientAppointments(page = 1, pageSize = 20): Promise<Appointment[] | { items: Appointment[] }> {
    return apiClient<Appointment[] | { items: Appointment[] }>(`/appointments?page=${page}&pageSize=${pageSize}`);
  },

  async getAppointmentById(appointmentId: string): Promise<Appointment> {
    return apiClient<Appointment>(`/appointments/${appointmentId}`);
  },

  async listHospitalAppointments(page = 1, pageSize = 50): Promise<Appointment[] | { items: Appointment[] }> {
    return apiClient<Appointment[] | { items: Appointment[] }>(`/admin/appointments?page=${page}&pageSize=${pageSize}`);
  },

  async updateAppointmentStatus(
    appointmentId: string,
    status: 'accepted' | 'rejected',
    rejectionReason?: string
  ): Promise<Appointment> {
    return apiClient<Appointment>(`/admin/appointments/${appointmentId}`, {
      method: 'PATCH',
      body: JSON.stringify({
        status,
        ...(rejectionReason ? { rejectionReason } : {}),
      }),
    });
  },
};
