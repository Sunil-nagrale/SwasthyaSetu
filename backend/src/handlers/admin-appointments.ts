import { APIGatewayProxyEvent, APIGatewayProxyResult } from '../types/aws.js';
import { withErrorHandler } from '../middleware/error.middleware.js';
import { requireRole, resolveHospitalAdminScope } from '../middleware/auth.middleware.js';
import { parseJsonBody } from '../middleware/request.middleware.js';
import { appointmentService } from '../services/appointment.service.js';
import { hospitalAdminMappingRepo } from '../repositories/container.js';
import {
  UpdateAppointmentStatusSchema,
  AppointmentIdParamSchema,
} from '../validators/appointment.validator.js';
import { PaginationQuerySchema } from '../validators/common.validator.js';
import { ok } from '../utils/response.js';

export const listHospitalAppointmentsHandler = withErrorHandler(
  async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    const auth = requireRole(event, ['hospital_admin']);
    await resolveHospitalAdminScope(auth, hospitalAdminMappingRepo);

    const query = PaginationQuerySchema.parse(event.queryStringParameters || {});
    const appointments = await appointmentService.getHospitalAppointments(
      auth,
      query.page,
      query.pageSize
    );

    return ok(appointments);
  }
);

export const updateAppointmentStatusHandler = withErrorHandler(
  async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    const auth = requireRole(event, ['hospital_admin']);
    await resolveHospitalAdminScope(auth, hospitalAdminMappingRepo);

    const { appointmentId } = AppointmentIdParamSchema.parse(event.pathParameters || {});
    const body = parseJsonBody(event);
    const validated = UpdateAppointmentStatusSchema.parse(body);

    const updated = await appointmentService.updateAppointmentStatus(
      auth,
      appointmentId,
      validated.status,
      validated.rejectionReason
    );

    return ok(updated);
  }
);
