import { ZodError } from 'zod';
import { APIGatewayProxyEvent, APIGatewayProxyResult } from '../types/aws.js';
import { AppError } from '../utils/errors.js';
import { errorResponse } from '../utils/response.js';
import { logger } from '../utils/logger.js';

export type HandlerFunction = (event: APIGatewayProxyEvent) => Promise<APIGatewayProxyResult>;

export function withErrorHandler(handler: HandlerFunction): HandlerFunction {
  return async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    try {
      return await handler(event);
    } catch (err: unknown) {
      if (err instanceof ZodError) {
        const message = err.issues
          .map((issue) => `${issue.path.join('.') || 'body'}: ${issue.message}`)
          .join('; ');
        logger.warn('Request validation error', { path: event.path, message });
        return errorResponse(400, 'ERR_VALIDATION', message);
      }

      if (err instanceof AppError) {
        logger.warn(`Handled application error [${err.code}]: ${err.message}`, {
          path: event.path,
          statusCode: err.statusCode,
        });
        return errorResponse(err.statusCode, err.code, err.message);
      }

      // Unhandled / Unexpected error
      // logger.error('Unhandled server error', {
      //   path: event.path,
      //   error: err instanceof Error ? err.message : String(err),
      //   stack: err instanceof Error ? err.stack : undefined,
      // });
      // Unhandled / Unexpected error
// Avoid logging raw error messages or stack traces, which may contain sensitive data.
logger.error('Unhandled server error', {
  path: event.path,
  errorType: err instanceof Error ? err.name : 'UnknownError',
});

      return errorResponse(
        500,
        'ERR_INTERNAL_SERVER_ERROR',
        'An unexpected internal server error occurred'
      );
    }
  };
}
