import { APIGatewayProxyEvent, APIGatewayProxyResult } from '../types/aws.js';
import { withErrorHandler } from '../middleware/error.middleware.js';
import { requireRole } from '../middleware/auth.middleware.js';
import { calendarService } from '../services/calendar.service.js';
import { ok } from '../utils/response.js';

export const listOngoingMedicationsHandler = withErrorHandler(
  async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    const auth = requireRole(event, ['patient']);
    const medications = await calendarService.listMedications(auth);
    return ok(medications);
  }
);
