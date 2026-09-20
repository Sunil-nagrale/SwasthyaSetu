import { randomUUID } from 'node:crypto';
import { IAppointmentRepository } from '../repositories/interfaces/appointment.repository.js';
import { IHospitalRepository } from '../repositories/interfaces/hospital.repository.js';
import { ICalendarRepository } from '../repositories/interfaces/calendar.repository.js';
import { IUserRepository } from '../repositories/interfaces/user.repository.js';
import {
  appointmentRepo as defaultAppointmentRepo,
  hospitalRepo as defaultHospitalRepo,
  calendarRepo as defaultCalendarRepo,
  userRepo as defaultUserRepo,
} from '../repositories/container.js';
import { HospitalService, hospitalService } from './hospital.service.js';
import { Appointment, AppointmentStatus } from '../types/appointment.js';
import { AuthContext } from '../types/auth.js';
import { PaginatedResult } from '../types/api.js';
import { CreateAppointmentInput } from '../validators/appointment.validator.js';
import {
  NotFoundError,
  ForbiddenError,
  BadRequestError,
  IllegalStateTransitionError,
} from '../utils/errors.js';

export class AppointmentService {
  constructor(
    private appointmentRepo: IAppointmentRepository = defaultAppointmentRepo,
    private hospitalRepo: IHospitalRepository = defaultHospitalRepo,
    private calendarRepo: ICalendarRepository = defaultCalendarRepo,
    private userRepo: IUserRepository = defaultUserRepo,
    private hospitalSvc: HospitalService = hospitalService
  ) {}

  async createAppointment(
    auth: AuthContext,
    input: CreateAppointmentInput
  ): Promise<Appointment> {
    // 1. Verify hospital existence
    const hospital = await this.hospitalRepo.getHospitalById(input.hospitalId);
    if (!hospital) {
      throw new NotFoundError(`Hospital '${input.hospitalId}' not found`, 'ERR_NOT_FOUND');
    }

    // 2. Verify doctor existence
    const doctor = await this.hospitalRepo.getDoctorById(input.hospitalId, input.doctorId);
    if (!doctor) {
      throw new NotFoundError(
        `Doctor '${input.doctorId}' not found at hospital '${input.hospitalId}'`,
        'ERR_NOT_FOUND'
      );
    }

    // 3. Server-side Availability Check (Contract Section 15)
    const availability = await this.hospitalSvc.computeDoctorAvailability(
      input.hospitalId,
      input.doctorId,
      input.preferredDate
    );

    if (!availability.availableSlots.includes(input.preferredTime)) {
      throw new BadRequestError(
        `Requested time slot ${input.preferredTime} is not available for ${doctor.name} on ${input.preferredDate}`,
        'ERR_BAD_REQUEST'
      );
    }

    // 4. Fetch patient profile snapshot
    const profile = await this.userRepo.getProfile(auth.userId);
    const patientName = profile?.name || 'Registered Patient';
    const patientPhone = profile?.phone || '';

    // 5. Construct Appointment Entity
    const now = new Date().toISOString();
    const appointment: Appointment = {
      appointmentId: randomUUID(),
      patientId: auth.userId,
      hospitalId: input.hospitalId,
      doctorId: input.doctorId,
      status: 'pending',
      preferredDate: input.preferredDate,
      preferredTime: input.preferredTime,
      patientVisitNote: input.patientVisitNote,
      hospitalSnapshot: {
        hospitalId: hospital.hospitalId,
        name: hospital.name,
      },
      doctorSnapshot: {
        doctorId: doctor.doctorId,
        name: doctor.name,
        specialty: doctor.specialty,
      },
      patientSnapshot: {
        patientId: auth.userId,
        name: patientName,
        phone: patientPhone,
        email: auth.email,
      },
      createdAt: now,
      updatedAt: now,
    };

    return this.appointmentRepo.createAppointment(appointment);
  }

  async getPatientAppointments(
    auth: AuthContext,
    page = 1,
    pageSize = 20
  ): Promise<PaginatedResult<Appointment>> {
    return this.appointmentRepo.listByPatient(auth.userId, page, pageSize);
  }

  async getAppointmentDetail(
    auth: AuthContext,
    appointmentId: string
  ): Promise<Appointment> {
    const appointment = await this.appointmentRepo.getAppointmentById(appointmentId);
    if (!appointment) {
      throw new NotFoundError(`Appointment '${appointmentId}' not found`, 'ERR_NOT_FOUND');
    }

    // Ownership & Scope verification:
    // Allowed if:
    // 1. Patient owns the appointment (patientId == auth.userId)
    // 2. Hospital admin is mapped to this hospital (auth.hospitalId == appointment.hospitalId)
    // 3. Super admin
    const isOwnerPatient =
      auth.roles.includes('patient') && appointment.patientId === auth.userId;
    const isAssignedHospitalAdmin =
      auth.roles.includes('hospital_admin') && auth.hospitalId === appointment.hospitalId;

    if (!isOwnerPatient && !isAssignedHospitalAdmin) {
      throw new ForbiddenError(
        'Forbidden: you are not authorized to view this appointment',
        'ERR_FORBIDDEN'
      );
    }

    return appointment;
  }

  async getHospitalAppointments(
    auth: AuthContext,
    page = 1,
    pageSize = 20
  ): Promise<PaginatedResult<Appointment>> {
    if (!auth.hospitalId) {
      throw new ForbiddenError(
        'Forbidden: no authorized hospital scope found for this administrator',
        'ERR_SCOPE_VIOLATION'
      );
    }

    return this.appointmentRepo.listByHospital(auth.hospitalId, page, pageSize);
  }

  async updateAppointmentStatus(
    auth: AuthContext,
    appointmentId: string,
    newStatus: 'accepted' | 'rejected',
    rejectionReason?: string
  ): Promise<Appointment> {
    const appointment = await this.appointmentRepo.getAppointmentById(appointmentId);
    if (!appointment) {
      throw new NotFoundError(`Appointment '${appointmentId}' not found`, 'ERR_NOT_FOUND');
    }

    // Cross-hospital isolation check (Contract Section 7)
    if (appointment.hospitalId !== auth.hospitalId) {
      throw new ForbiddenError(
        "Forbidden: hospital administrator cannot access or update another hospital's appointment",
        'ERR_SCOPE_VIOLATION'
      );
    }

    // Appointment State Machine (Contract Section 8)
    // Allowed transitions: pending -> accepted, pending -> rejected
    if (appointment.status === 'accepted' && newStatus === 'accepted') {
      const existingEvent = await this.calendarRepo.findEventByAppointmentId(
        appointment.appointmentId
      );
      if (!existingEvent) {
        const now = new Date().toISOString();
        await this.calendarRepo.saveCalendarEvent({
          eventId: `cal_${appointment.appointmentId}`,
          patientId: appointment.patientId,
          title: `Doctor Consultation - ${appointment.doctorSnapshot.name}`,
          description: `Appointment at ${appointment.hospitalSnapshot.name} with ${appointment.doctorSnapshot.name} (${appointment.doctorSnapshot.specialty || 'General'})`,
          date: appointment.preferredDate,
          time: appointment.preferredTime,
          type: 'appointment',
          appointmentId: appointment.appointmentId,
          createdAt: now,
          updatedAt: now,
        });
      }
      return appointment;
    }

    if (appointment.status !== 'pending') {
      throw new IllegalStateTransitionError(
        `Cannot transition appointment from status '${appointment.status}' to '${newStatus}'. Only 'pending' appointments can be updated by admin.`,
        'ERR_INVALID_STATE_TRANSITION'
      );
    }

    const now = new Date().toISOString();
    appointment.status = newStatus;
    appointment.updatedAt = now;

    if (newStatus === 'accepted') {
      appointment.acceptedAt = now;

      // Idempotent Calendar Creation (Contract Section 9)
      const existingEvent = await this.calendarRepo.findEventByAppointmentId(appointment.appointmentId);
      if (!existingEvent) {
        await this.calendarRepo.saveCalendarEvent({
          eventId: `cal_${appointment.appointmentId}`,
          patientId: appointment.patientId,
          title: `Doctor Consultation - ${appointment.doctorSnapshot.name}`,
          description: `Appointment at ${appointment.hospitalSnapshot.name} with ${appointment.doctorSnapshot.name} (${appointment.doctorSnapshot.specialty || 'General'})`,
          date: appointment.preferredDate,
          time: appointment.preferredTime,
          type: 'appointment',
          appointmentId: appointment.appointmentId,
          createdAt: now,
          updatedAt: now,
        });
      }
    } else if (newStatus === 'rejected') {
      appointment.rejectedAt = now;
      if (rejectionReason) {
        appointment.rejectionReason = rejectionReason;
      }
    }

    return this.appointmentRepo.updateAppointment(appointment);
  }

  async cancelAppointment(auth: AuthContext, appointmentId: string): Promise<Appointment> {
    const appointment = await this.appointmentRepo.getAppointmentById(appointmentId);
    if (!appointment) {
      throw new NotFoundError(`Appointment '${appointmentId}' not found`, 'ERR_NOT_FOUND');
    }

    // Verify patient ownership
    if (appointment.patientId !== auth.userId) {
      throw new ForbiddenError(
        'Forbidden: only the patient who requested the appointment can cancel it',
        'ERR_OWNERSHIP_VIOLATION'
      );
    }

    // Allowed transition: accepted -> canceled or pending -> canceled
    if (appointment.status !== 'accepted' && appointment.status !== 'pending') {
      throw new IllegalStateTransitionError(
        `Cannot cancel an appointment with status '${appointment.status}'`,
        'ERR_INVALID_STATE_TRANSITION'
      );
    }

    const now = new Date().toISOString();
    appointment.status = 'canceled';
    appointment.canceledAt = now;
    appointment.updatedAt = now;

    return this.appointmentRepo.updateAppointment(appointment);
  }
}

export const appointmentService = new AppointmentService();
