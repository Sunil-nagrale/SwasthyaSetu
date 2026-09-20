import { APIGatewayProxyEvent, APIGatewayProxyResult } from '../types/aws.js';
import { withErrorHandler } from '../middleware/error.middleware.js';
import { requireRole } from '../middleware/auth.middleware.js';
import { parseJsonBody } from '../middleware/request.middleware.js';
import { appointmentService } from '../services/appointment.service.js';
import {
  CreateAppointmentSchema,
  AppointmentIdParamSchema,
} from '../validators/appointment.validator.js';
import { PaginationQuerySchema } from '../validators/common.validator.js';
import { ok, created } from '../utils/response.js';
import { hospitalAdminMappingRepo } from '../repositories/container.js';

export const createAppointmentHandler = withErrorHandler(
  async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    const auth = requireRole(event, ['patient']);
    const body = parseJsonBody(event);
    const validated = CreateAppointmentSchema.parse(body);

    const appointment = await appointmentService.createAppointment(auth, validated);
    return created(appointment);
  }
);

export const listPatientAppointmentsHandler = withErrorHandler(
  async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    const auth = requireRole(event, ['patient']);
    const query = PaginationQuerySchema.parse(event.queryStringParameters || {});

    const appointments = await appointmentService.getPatientAppointments(
      auth,
      query.page,
      query.pageSize
    );
    return ok(appointments);
  }
);

export const getAppointmentDetailHandler = withErrorHandler(
  async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    const auth = requireRole(event, ['patient', 'hospital_admin']);
    const { appointmentId } = AppointmentIdParamSchema.parse(event.pathParameters || {});

    if (auth.roles.includes('hospital_admin') && !auth.hospitalId) {
      const mapping = await hospitalAdminMappingRepo.getMappingByUserId(auth.userId);
      if (mapping) auth.hospitalId = mapping.hospitalId;
    }

    const appointment = await appointmentService.getAppointmentDetail(auth, appointmentId);
    return ok(appointment);
  }
);

export const cancelAppointmentHandler = withErrorHandler(
  async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    const auth = requireRole(event, ['patient']);
    const { appointmentId } = AppointmentIdParamSchema.parse(event.pathParameters || {});

    const appointment = await appointmentService.cancelAppointment(auth, appointmentId);
    return ok(appointment);
  }
);
