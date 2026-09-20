import { Appointment } from '../../types/appointment.js';
import { PaginatedResult } from '../../types/api.js';
import { IAppointmentRepository } from '../interfaces/appointment.repository.js';

export class InMemoryAppointmentRepository implements IAppointmentRepository {
  private appointments: Map<string, Appointment> = new Map();

  async createAppointment(appointment: Appointment): Promise<Appointment> {
    this.appointments.set(appointment.appointmentId, { ...appointment });
    return { ...appointment };
  }

  async getAppointmentById(appointmentId: string): Promise<Appointment | null> {
    const a = this.appointments.get(appointmentId);
    return a ? { ...a } : null;
  }

  async listByPatient(
    patientId: string,
    page = 1,
    pageSize = 20
  ): Promise<PaginatedResult<Appointment>> {
    const matching = Array.from(this.appointments.values())
      .filter((a) => a.patientId === patientId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    const totalCount = matching.length;
    const startIndex = (page - 1) * pageSize;
    const items = matching.slice(startIndex, startIndex + pageSize).map((a) => ({ ...a }));

    return {
      totalCount,
      page,
      pageSize,
      items,
    };
  }

  async listByHospital(
    hospitalId: string,
    page = 1,
    pageSize = 20
  ): Promise<PaginatedResult<Appointment>> {
    const matching = Array.from(this.appointments.values())
      .filter((a) => a.hospitalId === hospitalId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    const totalCount = matching.length;
    const startIndex = (page - 1) * pageSize;
    const items = matching.slice(startIndex, startIndex + pageSize).map((a) => ({ ...a }));

    return {
      totalCount,
      page,
      pageSize,
      items,
    };
  }

  async updateAppointment(appointment: Appointment): Promise<Appointment> {
    this.appointments.set(appointment.appointmentId, { ...appointment });
    return { ...appointment };
  }

  async listAcceptedByDoctorOnDate(
    hospitalId: string,
    doctorId: string,
    date: string
  ): Promise<Appointment[]> {
    return Array.from(this.appointments.values())
      .filter(
        (a) =>
          a.hospitalId === hospitalId &&
          a.doctorId === doctorId &&
          a.preferredDate === date &&
          a.status === 'accepted'
      )
      .map((a) => ({ ...a }));
  }
}

export const inMemoryAppointmentRepo = new InMemoryAppointmentRepository();
