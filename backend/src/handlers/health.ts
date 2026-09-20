import { APIGatewayProxyEvent, APIGatewayProxyResult } from '../types/aws.js';
import { withErrorHandler } from '../middleware/error.middleware.js';
import { ok } from '../utils/response.js';

export const healthHandler = withErrorHandler(
  async (_event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    return ok({
      status: 'healthy',
      service: 'SwasthyaSetu Backend API',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
    });
  }
);
