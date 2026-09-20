import { APIGatewayProxyEvent, APIGatewayProxyResult } from '../types/aws.js';
import { withErrorHandler } from '../middleware/error.middleware.js';
import { hospitalService } from '../services/hospital.service.js';
import {
  HospitalSearchQuerySchema,
  HospitalIdParamSchema,
  DepartmentIdParamSchema,
} from '../validators/hospital.validator.js';
import { ok } from '../utils/response.js';

export const searchHospitalsHandler = withErrorHandler(
  async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    const rawQuery = event.queryStringParameters || {};
    const validated = HospitalSearchQuerySchema.parse(rawQuery);

    const result = await hospitalService.searchHospitals(
      {
        city: validated.city,
        type: validated.type,
        specialty: validated.specialty,
        query: validated.query,
      },
      validated.page,
      validated.pageSize
    );

    return ok(result);
  }
);

export const getHospitalDetailsHandler = withErrorHandler(
  async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    const { hospitalId } = HospitalIdParamSchema.parse(event.pathParameters || {});
    const hospital = await hospitalService.getHospitalDetails(hospitalId);
    return ok(hospital);
  }
);

export const getDepartmentsHandler = withErrorHandler(
  async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    const { hospitalId } = HospitalIdParamSchema.parse(event.pathParameters || {});
    const departments = await hospitalService.getDepartments(hospitalId);
    return ok(departments);
  }
);

export const getDepartmentDetailsHandler = withErrorHandler(
  async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    const { hospitalId, departmentId } = DepartmentIdParamSchema.parse(
      event.pathParameters || {}
    );
    const result = await hospitalService.getDepartmentDetails(hospitalId, departmentId);
    return ok(result);
  }
);

export const getDoctorsHandler = withErrorHandler(
  async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    const { hospitalId } = HospitalIdParamSchema.parse(event.pathParameters || {});
    const departmentId = event.queryStringParameters?.departmentId;
    const doctors = await hospitalService.getDoctors(hospitalId, departmentId);
    return ok(doctors);
  }
);

export const getLabTestsHandler = withErrorHandler(
  async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    const { hospitalId } = HospitalIdParamSchema.parse(event.pathParameters || {});
    const labs = await hospitalService.getLabTests(hospitalId);
    return ok(labs);
  }
);

export const getDoctorAvailabilityHandler = withErrorHandler(
  async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    const { DoctorIdParamSchema, DoctorAvailabilityQuerySchema } = await import(
      '../validators/hospital.validator.js'
    );
    const { hospitalId, doctorId } = DoctorIdParamSchema.parse(event.pathParameters || {});
    const query = DoctorAvailabilityQuerySchema.parse(event.queryStringParameters || {});
    const targetDate =
      query.date || new Date(Date.now() + 86400000).toISOString().split('T')[0]!;
    const availability = await hospitalService.computeDoctorAvailability(
      hospitalId,
      doctorId,
      targetDate
    );
    return ok(availability);
  }
);
