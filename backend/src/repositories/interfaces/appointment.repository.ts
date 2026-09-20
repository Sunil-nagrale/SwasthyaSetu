import { Appointment } from '../../types/appointment.js';
import { PaginatedResult } from '../../types/api.js';

export interface IAppointmentRepository {
  createAppointment(appointment: Appointment): Promise<Appointment>;
  getAppointmentById(appointmentId: string): Promise<Appointment | null>;
  listByPatient(
    patientId: string,
    page: number,
    pageSize: number
  ): Promise<PaginatedResult<Appointment>>;
  listByHospital(
    hospitalId: string,
    page: number,
    pageSize: number
  ): Promise<PaginatedResult<Appointment>>;
  updateAppointment(appointment: Appointment): Promise<Appointment>;
  listAcceptedByDoctorOnDate(
    hospitalId: string,
    doctorId: string,
    date: string
  ): Promise<Appointment[]>;
}
