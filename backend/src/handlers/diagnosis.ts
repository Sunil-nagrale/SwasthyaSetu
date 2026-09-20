import { APIGatewayProxyEvent, APIGatewayProxyResult } from '../types/aws.js';
import { withErrorHandler } from '../middleware/error.middleware.js';
import { parseJsonBody } from '../middleware/request.middleware.js';
import { aiService } from '../services/ai.service.js';
import {
  SymptomSubmissionSchema,
  DiagnosisQuestionQuerySchema,
  DiagnosisResultSchema,
} from '../validators/ai.validator.js';
import { ok } from '../utils/response.js';

export const submitSymptomsHandler = withErrorHandler(
  async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    const body = parseJsonBody(event);
    const validated = SymptomSubmissionSchema.parse(body);

    const res = await aiService.submitSymptoms(validated);
    return ok(res);
  }
);

export const getDiagnosisQuestionsHandler = withErrorHandler(
  async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    const query = DiagnosisQuestionQuerySchema.parse(event.queryStringParameters || {});
    const res = await aiService.getFollowupQuestions(query.sessionId);
    return ok(res);
  }
);

export const getDiagnosisResultHandler = withErrorHandler(
  async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    const body = parseJsonBody(event);
    const validated = DiagnosisResultSchema.parse(body);

    const res = await aiService.recommendSpecialist(validated);
    return ok(res);
  }
);
