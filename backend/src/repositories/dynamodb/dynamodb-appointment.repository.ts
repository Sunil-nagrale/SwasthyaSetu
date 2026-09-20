import { Appointment } from '../../types/appointment.js';
import { PaginatedResult } from '../../types/api.js';
import { IAppointmentRepository } from '../interfaces/appointment.repository.js';
import { appointmentSk, hospitalPk, patientPk } from './keys.js';
import { getItem, putItem, queryByPk, queryGsi, stripKeys } from './document.js';
import { paginateItems } from '../../utils/pagination.js';

function lookupPk(appointmentId: string): string {
  return `APPOINTMENT#${appointmentId}`;
}

export class DynamoAppointmentRepository implements IAppointmentRepository {
  async createAppointment(appointment: Appointment): Promise<Appointment> {
    await putItem({
      PK: patientPk(appointment.patientId),
      SK: appointmentSk(appointment.appointmentId),
      GSI1PK: hospitalPk(appointment.hospitalId),
      GSI1SK: appointmentSk(appointment.appointmentId),
      GSI2PK: `doctor#${appointment.doctorId}#date#${appointment.preferredDate}`,
      GSI2SK: appointmentSk(appointment.appointmentId),
      entityType: 'appointment',
      ...appointment,
    });
    await putItem({
      PK: lookupPk(appointment.appointmentId),
      SK: 'LOOKUP',
      entityType: 'appointment_lookup',
      appointmentId: appointment.appointmentId,
      patientId: appointment.patientId,
      hospitalId: appointment.hospitalId,
    });
    return appointment;
  }

  async getAppointmentById(appointmentId: string): Promise<Appointment | null> {
    const lookup = await getItem(lookupPk(appointmentId), 'LOOKUP');
    if (!lookup || typeof lookup.patientId !== 'string') return null;
    const item = await getItem(patientPk(lookup.patientId), appointmentSk(appointmentId));
    return item ? stripKeys<Appointment>(item) : null;
  }

  async listByPatient(
    patientId: string,
    page: number,
    pageSize: number
  ): Promise<PaginatedResult<Appointment>> {
    const items = (await queryByPk(patientPk(patientId), 'appointment#')).map((i) =>
      stripKeys<Appointment>(i)
    );
    items.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    return paginateItems(items, page, pageSize);
  }

  async listByHospital(
    hospitalId: string,
    page: number,
    pageSize: number
  ): Promise<PaginatedResult<Appointment>> {
    const items = (await queryGsi('GSI1', 'GSI1PK', hospitalPk(hospitalId))).map((i) =>
      stripKeys<Appointment>(i)
    );
    items.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    return paginateItems(items, page, pageSize);
  }

  async listAcceptedByDoctorOnDate(
    hospitalId: string,
    doctorId: string,
    date: string
  ): Promise<Appointment[]> {
    return (await queryGsi('GSI2', 'GSI2PK', `doctor#${doctorId}#date#${date}`))
      .map((i) => stripKeys<Appointment>(i))
      .filter((a) => a.hospitalId === hospitalId && a.status === 'accepted');
  }

  async updateAppointment(appointment: Appointment): Promise<Appointment> {
    return this.createAppointment(appointment);
  }
}

export const dynamoAppointmentRepo = new DynamoAppointmentRepository();
