import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { AppointmentService } from '../src/services/appointment.service.js';
import { InMemoryAppointmentRepository } from '../src/repositories/in-memory/in-memory-appointment.repository.js';
import { InMemoryHospitalRepository } from '../src/repositories/in-memory/in-memory-hospital.repository.js';
import { InMemoryCalendarRepository } from '../src/repositories/in-memory/in-memory-calendar.repository.js';
import { InMemoryUserRepository } from '../src/repositories/in-memory/in-memory-user.repository.js';
import { HospitalService } from '../src/services/hospital.service.js';
import {
  SHARDA_HOSPITAL_ID,
  SHARDA_DOCTOR_ID,
  MAX_HOSPITAL_ID,
} from '../src/repositories/in-memory/seed-data.js';
import { AuthContext } from '../src/types/auth.js';
import { ForbiddenError, IllegalStateTransitionError, BadRequestError } from '../src/utils/errors.js';

describe('Appointment Lifecycle & Cross-Hospital Isolation', () => {
  let appointmentRepo: InMemoryAppointmentRepository;
  let hospitalRepo: InMemoryHospitalRepository;
  let calendarRepo: InMemoryCalendarRepository;
  let userRepo: InMemoryUserRepository;
  let appointmentService: AppointmentService;

  const patientAuth: AuthContext = {
    userId: 'patient-test-001',
    email: 'patient@example.com',
    roles: ['patient'],
  };

  const otherPatientAuth: AuthContext = {
    userId: 'patient-test-999',
    email: 'other@example.com',
    roles: ['patient'],
  };

  const shardaAdminAuth: AuthContext = {
    userId: 'admin-sharda-001',
    email: 'sharda-admin@example.com',
    roles: ['hospital_admin'],
    hospitalId: SHARDA_HOSPITAL_ID,
  };

  const maxAdminAuth: AuthContext = {
    userId: 'admin-max-002',
    email: 'max-admin@example.com',
    roles: ['hospital_admin'],
    hospitalId: MAX_HOSPITAL_ID,
  };

  beforeEach(() => {
    appointmentRepo = new InMemoryAppointmentRepository();
    hospitalRepo = new InMemoryHospitalRepository();
    calendarRepo = new InMemoryCalendarRepository();
    userRepo = new InMemoryUserRepository();
    const hospitalSvc = new HospitalService(hospitalRepo, appointmentRepo);

    appointmentService = new AppointmentService(
      appointmentRepo,
      hospitalRepo,
      calendarRepo,
      userRepo,
      hospitalSvc
    );
  });

  test('E2E Appointment Bridge: Create -> Pending -> Admin View -> Accept -> Idempotent Calendar', async () => {
    // 1. Patient creates appointment for Sharda Hospital
    const created = await appointmentService.createAppointment(patientAuth, {
      hospitalId: SHARDA_HOSPITAL_ID,
      doctorId: SHARDA_DOCTOR_ID,
      preferredDate: '2026-10-12', // Monday
      preferredTime: '09:00',
      patientVisitNote: 'Regular cardiac consultation',
    });

    assert.ok(created.appointmentId);
    assert.equal(created.status, 'pending');
    assert.equal(created.patientId, patientAuth.userId);
    assert.equal(created.hospitalSnapshot.name, 'Sharda Hospital');
    assert.equal(created.doctorSnapshot.name, 'Dr. Ramesh Sharma');

    // 2. Patient lists their own appointments
    const patientList = await appointmentService.getPatientAppointments(patientAuth);
    assert.equal(patientList.totalCount, 1);
    assert.equal(patientList.items[0]?.appointmentId, created.appointmentId);

    // 3. Sharda Hospital Admin views incoming requests
    const shardaList = await appointmentService.getHospitalAppointments(shardaAdminAuth);
    assert.equal(shardaList.totalCount, 1);
    assert.equal(shardaList.items[0]?.appointmentId, created.appointmentId);

    // 4. Cross-hospital isolation: Max Hospital admin CANNOT see Sharda Hospital requests
    const maxList = await appointmentService.getHospitalAppointments(maxAdminAuth);
    assert.equal(maxList.totalCount, 0);

    // 5. Cross-hospital isolation: Max Hospital admin CANNOT accept Sharda Hospital appointment
    await assert.rejects(
      async () =>
        appointmentService.updateAppointmentStatus(maxAdminAuth, created.appointmentId, 'accepted'),
      (err: unknown) => err instanceof ForbiddenError && err.code === 'ERR_SCOPE_VIOLATION'
    );

    // 6. Sharda Hospital Admin accepts the appointment
    const accepted = await appointmentService.updateAppointmentStatus(
      shardaAdminAuth,
      created.appointmentId,
      'accepted'
    );
    assert.equal(accepted.status, 'accepted');
    assert.ok(accepted.acceptedAt);

    // 7. Contract Section 9: Idempotent Calendar Creation
    const calendarEvents = await calendarRepo.listEventsByPatient(patientAuth.userId);
    assert.equal(calendarEvents.length, 1);
    assert.equal(calendarEvents[0]?.appointmentId, created.appointmentId);
    assert.equal(calendarEvents[0]?.date, '2026-10-12');
    assert.equal(calendarEvents[0]?.time, '09:00');

    const acceptedRetry = await appointmentService.updateAppointmentStatus(
      shardaAdminAuth,
      created.appointmentId,
      'accepted'
    );
    assert.equal(acceptedRetry.status, 'accepted');
    const calendarAfterRetry = await calendarRepo.listEventsByPatient(patientAuth.userId);
    assert.equal(calendarAfterRetry.length, 1);

    // 8. Illegal State Machine Transition: cannot transition accepted -> rejected
    await assert.rejects(
      async () =>
        appointmentService.updateAppointmentStatus(
          shardaAdminAuth,
          created.appointmentId,
          'rejected'
        ),
      (err: unknown) =>
        err instanceof IllegalStateTransitionError &&
        err.code === 'ERR_INVALID_STATE_TRANSITION'
    );

    // 9. Patient Cancellation: patient cancels their accepted appointment
    const canceled = await appointmentService.cancelAppointment(patientAuth, created.appointmentId);
    assert.equal(canceled.status, 'canceled');
    assert.ok(canceled.canceledAt);

    // 10. Patient Ownership Rule: another patient cannot cancel this appointment
    await assert.rejects(
      async () =>
        appointmentService.cancelAppointment(otherPatientAuth, created.appointmentId),
      (err: unknown) =>
        err instanceof ForbiddenError && err.code === 'ERR_OWNERSHIP_VIOLATION'
    );
  });
});

describe('Appointment availability (Contract Section 15)', () => {
  let appointmentRepo: InMemoryAppointmentRepository;
  let appointmentService: AppointmentService;

  const patientAuth: AuthContext = {
    userId: 'patient-test-001',
    email: 'patient@example.com',
    roles: ['patient'],
  };

  const secondPatientAuth: AuthContext = {
    userId: 'patient-test-002',
    email: 'patient2@example.com',
    roles: ['patient'],
  };

  const shardaAdminAuth: AuthContext = {
    userId: 'admin-sharda-001',
    email: 'sharda-admin@example.com',
    roles: ['hospital_admin'],
    hospitalId: SHARDA_HOSPITAL_ID,
  };

  beforeEach(() => {
    appointmentRepo = new InMemoryAppointmentRepository();
    const hospitalRepo = new InMemoryHospitalRepository();
    const calendarRepo = new InMemoryCalendarRepository();
    const userRepo = new InMemoryUserRepository();
    const hospitalSvc = new HospitalService(hospitalRepo, appointmentRepo);
    appointmentService = new AppointmentService(
      appointmentRepo,
      hospitalRepo,
      calendarRepo,
      userRepo,
      hospitalSvc
    );
  });

  test('rejects booking when the doctor has no slots on that date', async () => {
    await assert.rejects(
      async () =>
        appointmentService.createAppointment(patientAuth, {
          hospitalId: SHARDA_HOSPITAL_ID,
          doctorId: SHARDA_DOCTOR_ID,
          preferredDate: '2026-10-11',
          preferredTime: '09:00',
        }),
      (err: unknown) => err instanceof BadRequestError && err.code === 'ERR_BAD_REQUEST'
    );
  });

  test('rejects a time that is not an available slot', async () => {
    await assert.rejects(
      async () =>
        appointmentService.createAppointment(patientAuth, {
          hospitalId: SHARDA_HOSPITAL_ID,
          doctorId: SHARDA_DOCTOR_ID,
          preferredDate: '2026-10-12',
          preferredTime: '09:07',
        }),
      (err: unknown) => err instanceof BadRequestError && err.code === 'ERR_BAD_REQUEST'
    );
  });

  test('excludes accepted appointments from availability for the same doctor and slot', async () => {
    const first = await appointmentService.createAppointment(patientAuth, {
      hospitalId: SHARDA_HOSPITAL_ID,
      doctorId: SHARDA_DOCTOR_ID,
      preferredDate: '2026-10-12',
      preferredTime: '09:00',
    });
    await appointmentService.updateAppointmentStatus(
      shardaAdminAuth,
      first.appointmentId,
      'accepted'
    );

    await assert.rejects(
      async () =>
        appointmentService.createAppointment(secondPatientAuth, {
          hospitalId: SHARDA_HOSPITAL_ID,
          doctorId: SHARDA_DOCTOR_ID,
          preferredDate: '2026-10-12',
          preferredTime: '09:00',
        }),
      (err: unknown) => err instanceof BadRequestError && err.code === 'ERR_BAD_REQUEST'
    );

    const otherSlot = await appointmentService.createAppointment(secondPatientAuth, {
      hospitalId: SHARDA_HOSPITAL_ID,
      doctorId: SHARDA_DOCTOR_ID,
      preferredDate: '2026-10-12',
      preferredTime: '09:20',
    });
    assert.equal(otherSlot.status, 'pending');
    assert.equal(otherSlot.preferredTime, '09:20');
  });
});
