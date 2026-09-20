import { apiClient } from './client';

export type CalendarEventType = 'appointment' | 'medication_reminder' | 'lab_test' | 'followup' | 'custom';

export interface CalendarEventItem {
  eventId: string;
  patientId: string;
  title: string;
  description?: string;
  date: string; // YYYY-MM-DD
  time?: string; // HH:MM
  type: CalendarEventType;
  appointmentId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCalendarEventPayload {
  title: string;
  description?: string;
  date: string;
  time?: string;
  type: CalendarEventType;
  appointmentId?: string;
}

export interface UpdateCalendarEventPayload {
  title?: string;
  description?: string;
  date?: string;
  time?: string;
  type?: CalendarEventType;
}

export const calendarApi = {
  async listEvents(): Promise<CalendarEventItem[]> {
    return apiClient<CalendarEventItem[]>('/calendar');
  },

  async createEvent(payload: CreateCalendarEventPayload): Promise<CalendarEventItem> {
    return apiClient<CalendarEventItem>('/calendar', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async updateEvent(eventId: string, payload: UpdateCalendarEventPayload): Promise<CalendarEventItem> {
    return apiClient<CalendarEventItem>(`/calendar/${eventId}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  },

  async deleteEvent(eventId: string): Promise<void> {
    return apiClient<void>(`/calendar/${eventId}`, {
      method: 'DELETE',
    });
  },
};
