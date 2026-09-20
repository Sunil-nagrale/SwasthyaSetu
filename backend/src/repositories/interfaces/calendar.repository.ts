import { CalendarEvent, OngoingMedication } from '../../types/calendar.js';

export interface ICalendarRepository {
  saveCalendarEvent(event: CalendarEvent): Promise<CalendarEvent>;
  getCalendarEventById(eventId: string): Promise<CalendarEvent | null>;
  findEventByAppointmentId(appointmentId: string): Promise<CalendarEvent | null>;
  listEventsByPatient(patientId: string): Promise<CalendarEvent[]>;
  updateCalendarEvent(eventId: string, updates: Partial<CalendarEvent>): Promise<CalendarEvent | null>;
  deleteCalendarEvent(eventId: string): Promise<boolean>;

  saveOngoingMedication(med: OngoingMedication): Promise<OngoingMedication>;
  listMedicationsByPatient(patientId: string): Promise<OngoingMedication[]>;
  deactivateMedicationsByPrescription(patientId: string, prescriptionId: string): Promise<void>;
}
