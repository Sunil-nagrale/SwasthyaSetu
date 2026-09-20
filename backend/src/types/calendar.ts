export type CalendarEventType =
  | 'appointment'
  | 'medication_reminder'
  | 'lab_test'
  | 'followup'
  | 'custom';

export interface CalendarEvent {
  eventId: string;
  patientId: string;
  title: string;
  description?: string;
  date: string; // YYYY-MM-DD
  time?: string; // HH:MM
  type: CalendarEventType;
  appointmentId?: string; // Links to accepted appointment for idempotency
  createdAt: string;
  updatedAt: string;
}

export interface OngoingMedication {
  medicineId: string;
  patientId: string;
  prescriptionId?: string;
  name: string;
  dosage: string;
  frequency: string;
  instructions?: string;
  startDate: string;
  endDate?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}
