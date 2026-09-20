import { CalendarEvent, OngoingMedication } from '../../types/calendar.js';
import { ICalendarRepository } from '../interfaces/calendar.repository.js';
import { patientPk } from './keys.js';
import { deleteItem, getItem, putItem, queryByPk, stripKeys } from './document.js';

export class DynamoCalendarRepository implements ICalendarRepository {
  async saveCalendarEvent(event: CalendarEvent): Promise<CalendarEvent> {
    await putItem({
      PK: patientPk(event.patientId),
      SK: `calendar#${event.eventId}`,
      GSI1PK: event.appointmentId ? `appointment#${event.appointmentId}` : undefined,
      GSI1SK: event.appointmentId ? `calendar#${event.eventId}` : undefined,
      entityType: 'calendar',
      ...event,
    });
    await putItem({
      PK: `CALENDAR#${event.eventId}`,
      SK: 'LOOKUP',
      eventId: event.eventId,
      patientId: event.patientId,
      entityType: 'calendar_lookup',
    });
    if (event.appointmentId) {
      await putItem({
        PK: `APPOINTMENT_CAL#${event.appointmentId}`,
        SK: 'EVENT',
        eventId: event.eventId,
        patientId: event.patientId,
        entityType: 'calendar_appointment_lookup',
      });
    }
    return event;
  }

  async getCalendarEventById(eventId: string): Promise<CalendarEvent | null> {
    const lookup = await getItem(`CALENDAR#${eventId}`, 'LOOKUP');
    if (!lookup || typeof lookup.patientId !== 'string') return null;
    const item = await getItem(patientPk(lookup.patientId), `calendar#${eventId}`);
    return item ? stripKeys<CalendarEvent>(item) : null;
  }

  async findEventByAppointmentId(appointmentId: string): Promise<CalendarEvent | null> {
    const lookup = await getItem(`APPOINTMENT_CAL#${appointmentId}`, 'EVENT');
    if (!lookup || typeof lookup.eventId !== 'string' || typeof lookup.patientId !== 'string') {
      return null;
    }
    const item = await getItem(patientPk(lookup.patientId), `calendar#${lookup.eventId}`);
    return item ? stripKeys<CalendarEvent>(item) : null;
  }

  async listEventsByPatient(patientId: string): Promise<CalendarEvent[]> {
    return (await queryByPk(patientPk(patientId), 'calendar#')).map((i) =>
      stripKeys<CalendarEvent>(i)
    );
  }

  async updateCalendarEvent(
    eventId: string,
    updates: Partial<CalendarEvent>
  ): Promise<CalendarEvent | null> {
    const existing = await this.getCalendarEventById(eventId);
    if (!existing) return null;
    const updated = { ...existing, ...updates, updatedAt: new Date().toISOString() };
    await this.saveCalendarEvent(updated);
    return updated;
  }

  async deleteCalendarEvent(eventId: string): Promise<boolean> {
    const existing = await this.getCalendarEventById(eventId);
    if (!existing) return false;
    await deleteItem(patientPk(existing.patientId), `calendar#${eventId}`);
    await deleteItem(`CALENDAR#${eventId}`, 'LOOKUP');
    if (existing.appointmentId) {
      await deleteItem(`APPOINTMENT_CAL#${existing.appointmentId}`, 'EVENT');
    }
    return true;
  }

  async saveOngoingMedication(med: OngoingMedication): Promise<OngoingMedication> {
    await putItem({
      PK: patientPk(med.patientId),
      SK: `medication#${med.medicineId}`,
      entityType: 'medication',
      ...med,
    });
    return med;
  }

  async listMedicationsByPatient(patientId: string): Promise<OngoingMedication[]> {
    return (await queryByPk(patientPk(patientId), 'medication#'))
      .map((i) => stripKeys<OngoingMedication>(i))
      .filter((m) => m.isActive);
  }

  async deactivateMedicationsByPrescription(
    patientId: string,
    prescriptionId: string
  ): Promise<void> {
    const meds = (await queryByPk(patientPk(patientId), 'medication#')).map((i) =>
      stripKeys<OngoingMedication>(i)
    );
    for (const med of meds) {
      if (med.prescriptionId === prescriptionId) {
        await this.saveOngoingMedication({
          ...med,
          isActive: false,
          updatedAt: new Date().toISOString(),
        });
      }
    }
  }
}

export const dynamoCalendarRepo = new DynamoCalendarRepository();
