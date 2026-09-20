import { APIGatewayProxyEvent, APIGatewayProxyResult } from '../types/aws.js';
import { withErrorHandler } from '../middleware/error.middleware.js';
import { requireRole } from '../middleware/auth.middleware.js';
import { parseJsonBody } from '../middleware/request.middleware.js';
import { aiService } from '../services/ai.service.js';
import { HospitalChatSchema, PatientChatSchema } from '../validators/ai.validator.js';
import { ok } from '../utils/response.js';

export const hospitalChatHandler = withErrorHandler(
  async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    const auth = requireRole(event, ['patient']);
    const body = parseJsonBody(event);
    const validated = HospitalChatSchema.parse(body);

    const res = await aiService.hospitalChat(auth, validated);
    return ok(res);
  }
);

export const patientChatHandler = withErrorHandler(
  async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    const auth = requireRole(event, ['patient']);
    const body = parseJsonBody(event);
    const validated = PatientChatSchema.parse(body);

    const res = await aiService.patientChat(auth, validated);
    return ok(res);
  }
);
