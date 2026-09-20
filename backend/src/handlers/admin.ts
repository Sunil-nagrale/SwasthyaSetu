import { APIGatewayProxyEvent, APIGatewayProxyResult } from '../types/aws.js';
import { withErrorHandler } from '../middleware/error.middleware.js';
import { requireRole } from '../middleware/auth.middleware.js';
import { parseJsonBody, getPathParam } from '../middleware/request.middleware.js';
import { adminService } from '../services/admin.service.js';
import {
  CreateHospitalSchema,
  UpdateHospitalSchema,
  CreateDepartmentSchema,
  UpdateDepartmentSchema,
  CreateDoctorSchema,
  UpdateDoctorSchema,
  CreateScheduleSchema,
  UpdateScheduleSchema,
  CreateLabTestSchema,
  UpdateLabTestSchema,
} from '../validators/admin.validator.js';
import { ok, created, noContent } from '../utils/response.js';

// --- HOSPITALS ---
export const adminCreateHospitalHandler = withErrorHandler(
  async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    requireRole(event, ['admin']);
    const body = parseJsonBody(event);
    const validated = CreateHospitalSchema.parse(body);
    const hospital = await adminService.createHospital(validated);
    return created(hospital);
  }
);

export const adminListHospitalsHandler = withErrorHandler(
  async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    requireRole(event, ['admin']);
    const hospitals = await adminService.listHospitals();
    return ok(hospitals);
  }
);

export const adminGetHospitalHandler = withErrorHandler(
  async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    requireRole(event, ['admin']);
    const hospitalId = getPathParam(event, 'hospitalId');
    const hospital = await adminService.getHospital(hospitalId);
    return ok(hospital);
  }
);

export const adminUpdateHospitalHandler = withErrorHandler(
  async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    requireRole(event, ['admin']);
    const hospitalId = getPathParam(event, 'hospitalId');
    const body = parseJsonBody(event);
    const validated = UpdateHospitalSchema.parse(body);
    const hospital = await adminService.updateHospital(hospitalId, validated);
    return ok(hospital);
  }
);

export const adminDeleteHospitalHandler = withErrorHandler(
  async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    requireRole(event, ['admin']);
    const hospitalId = getPathParam(event, 'hospitalId');
    await adminService.deleteHospital(hospitalId);
    return noContent();
  }
);

// --- DEPARTMENTS ---
export const adminCreateDepartmentHandler = withErrorHandler(
  async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    requireRole(event, ['admin']);
    const body = parseJsonBody(event);
    const validated = CreateDepartmentSchema.parse(body);
    const dept = await adminService.createDepartment(validated);
    return created(dept);
  }
);

export const adminListDepartmentsHandler = withErrorHandler(
  async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    requireRole(event, ['admin']);
    const hospitalId = event.queryStringParameters?.hospitalId || '';
    const depts = await adminService.listDepartments(hospitalId);
    return ok(depts);
  }
);

export const adminUpdateDepartmentHandler = withErrorHandler(
  async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    requireRole(event, ['admin']);
    const departmentId = getPathParam(event, 'departmentId');
    const body = parseJsonBody(event);
    const validated = UpdateDepartmentSchema.parse(body);
    const dept = await adminService.updateDepartment(departmentId, validated);
    return ok(dept);
  }
);

export const adminDeleteDepartmentHandler = withErrorHandler(
  async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    requireRole(event, ['admin']);
    const departmentId = getPathParam(event, 'departmentId');
    await adminService.deleteDepartment(departmentId);
    return noContent();
  }
);

// --- DOCTORS ---
export const adminCreateDoctorHandler = withErrorHandler(
  async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    requireRole(event, ['admin']);
    const body = parseJsonBody(event);
    const validated = CreateDoctorSchema.parse(body);
    const doctor = await adminService.createDoctor(validated);
    return created(doctor);
  }
);

export const adminListDoctorsHandler = withErrorHandler(
  async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    requireRole(event, ['admin']);
    const hospitalId = event.queryStringParameters?.hospitalId || '';
    const deptId = event.queryStringParameters?.departmentId;
    const doctors = await adminService.listDoctors(hospitalId, deptId);
    return ok(doctors);
  }
);

export const adminUpdateDoctorHandler = withErrorHandler(
  async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    requireRole(event, ['admin']);
    const doctorId = getPathParam(event, 'doctorId');
    const body = parseJsonBody(event);
    const validated = UpdateDoctorSchema.parse(body);
    const doctor = await adminService.updateDoctor(doctorId, validated);
    return ok(doctor);
  }
);

export const adminDeleteDoctorHandler = withErrorHandler(
  async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    requireRole(event, ['admin']);
    const doctorId = getPathParam(event, 'doctorId');
    await adminService.deleteDoctor(doctorId);
    return noContent();
  }
);

// --- SCHEDULES ---
export const adminCreateScheduleHandler = withErrorHandler(
  async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    requireRole(event, ['admin']);
    const body = parseJsonBody(event);
    const validated = CreateScheduleSchema.parse(body);
    const schedule = await adminService.createSchedule(validated);
    return created(schedule);
  }
);

export const adminUpdateScheduleHandler = withErrorHandler(
  async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    requireRole(event, ['admin']);
    const scheduleId = getPathParam(event, 'scheduleId');
    const body = parseJsonBody(event);
    const validated = UpdateScheduleSchema.parse(body);
    const schedule = await adminService.updateSchedule(scheduleId, validated);
    return ok(schedule);
  }
);

export const adminDeleteScheduleHandler = withErrorHandler(
  async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    requireRole(event, ['admin']);
    const scheduleId = getPathParam(event, 'scheduleId');
    await adminService.deleteSchedule(scheduleId);
    return noContent();
  }
);

// --- LAB TESTS ---
export const adminCreateLabTestHandler = withErrorHandler(
  async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    requireRole(event, ['admin']);
    const body = parseJsonBody(event);
    const validated = CreateLabTestSchema.parse(body);
    const lab = await adminService.createLabTest(validated);
    return created(lab);
  }
);

export const adminUpdateLabTestHandler = withErrorHandler(
  async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    requireRole(event, ['admin']);
    const labId = getPathParam(event, 'labId');
    const body = parseJsonBody(event);
    const validated = UpdateLabTestSchema.parse(body);
    const lab = await adminService.updateLabTest(labId, validated);
    return ok(lab);
  }
);

export const adminDeleteLabTestHandler = withErrorHandler(
  async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    requireRole(event, ['admin']);
    const labId = getPathParam(event, 'labId');
    await adminService.deleteLabTest(labId);
    return noContent();
  }
);
