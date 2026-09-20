import { CalendarEvent, OngoingMedication } from '../../types/calendar.js';
import { ICalendarRepository } from '../interfaces/calendar.repository.js';
import { SEED_ONGOING_MEDICATIONS } from './seed-data.js';

export class InMemoryCalendarRepository implements ICalendarRepository {
  private events: Map<string, CalendarEvent> = new Map();
  private medications: Map<string, OngoingMedication> = new Map();

  constructor() {
    for (const m of SEED_ONGOING_MEDICATIONS) this.medications.set(m.medicineId, { ...m });
  }

  async saveCalendarEvent(event: CalendarEvent): Promise<CalendarEvent> {
    this.events.set(event.eventId, { ...event });
    return { ...event };
  }

  async getCalendarEventById(eventId: string): Promise<CalendarEvent | null> {
    const e = this.events.get(eventId);
    return e ? { ...e } : null;
  }

  async findEventByAppointmentId(appointmentId: string): Promise<CalendarEvent | null> {
    const match = Array.from(this.events.values()).find(
      (e) => e.appointmentId === appointmentId
    );
    return match ? { ...match } : null;
  }

  async listEventsByPatient(patientId: string): Promise<CalendarEvent[]> {
    return Array.from(this.events.values())
      .filter((e) => e.patientId === patientId)
      .sort((a, b) => a.date.localeCompare(b.date))
      .map((e) => ({ ...e }));
  }

  async updateCalendarEvent(
    eventId: string,
    updates: Partial<CalendarEvent>
  ): Promise<CalendarEvent | null> {
    const existing = this.events.get(eventId);
    if (!existing) return null;
    const updated = { ...existing, ...updates, updatedAt: new Date().toISOString() };
    this.events.set(eventId, updated);
    return { ...updated };
  }

  async deleteCalendarEvent(eventId: string): Promise<boolean> {
    return this.events.delete(eventId);
  }

  async saveOngoingMedication(med: OngoingMedication): Promise<OngoingMedication> {
    this.medications.set(med.medicineId, { ...med });
    return { ...med };
  }

  async listMedicationsByPatient(patientId: string): Promise<OngoingMedication[]> {
    return Array.from(this.medications.values())
      .filter((m) => m.patientId === patientId && m.isActive)
      .map((m) => ({ ...m }));
  }

  async deactivateMedicationsByPrescription(
    patientId: string,
    prescriptionId: string
  ): Promise<void> {
    for (const [id, med] of this.medications.entries()) {
      if (med.patientId === patientId && med.prescriptionId === prescriptionId) {
        this.medications.set(id, {
          ...med,
          isActive: false,
          updatedAt: new Date().toISOString(),
        });
      }
    }
  }
}

export const inMemoryCalendarRepo = new InMemoryCalendarRepository();
