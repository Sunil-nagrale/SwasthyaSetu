import { randomUUID } from 'node:crypto';
import { ICalendarRepository } from '../repositories/interfaces/calendar.repository.js';
import { calendarRepo as defaultCalendarRepo } from '../repositories/container.js';
import { CalendarEvent, OngoingMedication } from '../types/calendar.js';
import { AuthContext } from '../types/auth.js';
import {
  CreateCalendarEventInput,
  UpdateCalendarEventInput,
} from '../validators/calendar.validator.js';
import { NotFoundError, ForbiddenError } from '../utils/errors.js';

export class CalendarService {
  constructor(private calendarRepo: ICalendarRepository = defaultCalendarRepo) {}

  async listEvents(auth: AuthContext): Promise<CalendarEvent[]> {
    return this.calendarRepo.listEventsByPatient(auth.userId);
  }

  async createEvent(
    auth: AuthContext,
    input: CreateCalendarEventInput
  ): Promise<CalendarEvent> {
    if (input.appointmentId) {
      const linked = await this.calendarRepo.findEventByAppointmentId(input.appointmentId);
      if (linked) {
        if (linked.patientId !== auth.userId) {
          throw new ForbiddenError(
            "Forbidden: cannot create a calendar event for another patient's appointment",
            'ERR_OWNERSHIP_VIOLATION'
          );
        }
        return linked;
      }
    }

    const now = new Date().toISOString();
    const event: CalendarEvent = {
      eventId: randomUUID(),
      patientId: auth.userId,
      title: input.title,
      description: input.description,
      date: input.date,
      time: input.time,
      type: input.type,
      appointmentId: input.appointmentId,
      createdAt: now,
      updatedAt: now,
    };

    return this.calendarRepo.saveCalendarEvent(event);
  }

  async updateEvent(
    auth: AuthContext,
    eventId: string,
    input: UpdateCalendarEventInput
  ): Promise<CalendarEvent> {
    const existing = await this.calendarRepo.getCalendarEventById(eventId);
    if (!existing) {
      throw new NotFoundError(`Calendar event '${eventId}' not found`, 'ERR_NOT_FOUND');
    }

    if (existing.patientId !== auth.userId) {
      throw new ForbiddenError(
        "Forbidden: cannot update another patient's calendar event",
        'ERR_OWNERSHIP_VIOLATION'
      );
    }

    const updated = await this.calendarRepo.updateCalendarEvent(eventId, input);
    if (!updated) {
      throw new NotFoundError(`Calendar event '${eventId}' not found`, 'ERR_NOT_FOUND');
    }
    return updated;
  }

  async deleteEvent(auth: AuthContext, eventId: string): Promise<boolean> {
    const existing = await this.calendarRepo.getCalendarEventById(eventId);
    if (!existing) {
      throw new NotFoundError(`Calendar event '${eventId}' not found`, 'ERR_NOT_FOUND');
    }

    if (existing.patientId !== auth.userId) {
      throw new ForbiddenError(
        "Forbidden: cannot delete another patient's calendar event",
        'ERR_OWNERSHIP_VIOLATION'
      );
    }

    return this.calendarRepo.deleteCalendarEvent(eventId);
  }

  async listMedications(auth: AuthContext): Promise<OngoingMedication[]> {
    return this.calendarRepo.listMedicationsByPatient(auth.userId);
  }
}

export const calendarService = new CalendarService();
