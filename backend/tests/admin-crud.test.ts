import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { adminCreateHospitalHandler, adminListHospitalsHandler, adminGetHospitalHandler } from '../src/handlers/admin.js';
import { InMemoryHospitalRepository } from '../src/repositories/in-memory/in-memory-hospital.repository.js';
import { AdminService } from '../src/services/admin.service.js';
import { APIGatewayProxyEvent } from '../src/types/aws.js';

function mockAdminEvent(body: unknown = null, pathParams: Record<string, string> | null = null): APIGatewayProxyEvent {
  return {
    body: body ? JSON.stringify(body) : null,
    headers: { Authorization: 'Bearer mock-admin-super1' },
    httpMethod: 'POST',
    isBase64Encoded: false,
    path: '/admin/hospitals',
    pathParameters: pathParams,
    queryStringParameters: null,
    requestContext: { httpMethod: 'POST', path: '/admin/hospitals', requestId: 'req-adm-01' },
  };
}

function mockUnauthorizedEvent(): APIGatewayProxyEvent {
  return {
    body: JSON.stringify({ name: 'Test' }),
    headers: { Authorization: 'Bearer mock-patient-patient001' },
    httpMethod: 'POST',
    isBase64Encoded: false,
    path: '/admin/hospitals',
    pathParameters: null,
    queryStringParameters: null,
    requestContext: { httpMethod: 'POST', path: '/admin/hospitals', requestId: 'req-adm-02' },
  };
}

describe('Admin CRUD Workflows & Role Protection', () => {
  let adminService: AdminService;
  let hospitalRepo: InMemoryHospitalRepository;

  beforeEach(() => {
    hospitalRepo = new InMemoryHospitalRepository();
    adminService = new AdminService(hospitalRepo);
  });

  test('admin can create, retrieve, update, and delete hospital', async () => {
    const created = await adminService.createHospital({
      name: 'City Care General Hospital',
      type: 'private',
      city: 'Greater Noida',
      location: 'Sector 150',
      address: 'Plot 10, Sector 150, Expressway',
      phone: '+91-120-9988776',
      email: 'care@citycare.org',
      specialties: ['General Medicine', 'Pediatrics'],
    });

    assert.ok(created.hospitalId);
    assert.equal(created.name, 'City Care General Hospital');

    // Retrieve
    const retrieved = await adminService.getHospital(created.hospitalId);
    assert.equal(retrieved.hospitalId, created.hospitalId);

    // Update
    const updated = await adminService.updateHospital(created.hospitalId, {
      phone: '+91-120-1122334',
    });
    assert.equal(updated.phone, '+91-120-1122334');

    // Delete
    const deleted = await adminService.deleteHospital(created.hospitalId);
    assert.equal(deleted, true);
  });

  test('admin CRUD handlers enforce admin role (rejects patient)', async () => {
    const res = await adminCreateHospitalHandler(mockUnauthorizedEvent());
    assert.equal(res.statusCode, 403);
    const body = JSON.parse(res.body);
    assert.equal(body.error.code, 'ERR_FORBIDDEN');
  });

  test('admin can manage departments, doctors, schedules, and lab tests', async () => {
    // 1. Create Department
    const dept = await adminService.createDepartment({
      hospitalId: '11111111-1111-1111-1111-111111111111',
      name: 'Neurology',
      description: 'Comprehensive neurological and stroke care',
      facilities: ['EEG', 'EMG', 'Stroke ICU'],
    });
    assert.ok(dept.departmentId);

    // 2. Create Doctor
    const doctor = await adminService.createDoctor({
      hospitalId: '11111111-1111-1111-1111-111111111111',
      departmentId: dept.departmentId,
      name: 'Dr. Vivek Mehra',
      specialty: 'Neurology',
      qualifications: 'MBBS, MD, DM (Neurology)',
      experienceYears: 15,
      consultationFee: 900,
      availableDays: ['Tuesday', 'Thursday'],
      timings: '10:00 - 14:00',
    });
    assert.ok(doctor.doctorId);

    // 3. Create Schedule
    const sched = await adminService.createSchedule({
      hospitalId: '11111111-1111-1111-1111-111111111111',
      doctorId: doctor.doctorId,
      dayOfWeek: 'Tuesday',
      startTime: '10:00',
      endTime: '14:00',
      slotDurationMinutes: 20,
      maxPatients: 12,
    });
    assert.ok(sched.scheduleId);

    // 4. Create Lab Test
    const lab = await adminService.createLabTest({
      hospitalId: '11111111-1111-1111-1111-111111111111',
      testName: 'Brain MRI Screening',
      category: 'Radiology',
      price: 3500,
      turnaroundHours: 24,
      instructions: 'Remove all metallic objects prior to scan.',
    });
    assert.ok(lab.labId);
  });
});
