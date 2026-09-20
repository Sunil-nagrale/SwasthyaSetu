import { APIGatewayProxyEvent } from '../types/aws.js';
import { BadRequestError } from '../utils/errors.js';

export function parseJsonBody<T = unknown>(event: APIGatewayProxyEvent): T {
  if (!event.body) {
    throw new BadRequestError('Request body is required', 'ERR_BAD_REQUEST');
  }

  try {
    const raw = event.isBase64Encoded
      ? Buffer.from(event.body, 'base64').toString('utf-8')
      : event.body;
    return JSON.parse(raw) as T;
  } catch {
    throw new BadRequestError('Malformed JSON payload in request body', 'ERR_BAD_REQUEST');
  }
}

export function parseOptionalJsonBody<T = unknown>(event: APIGatewayProxyEvent): T | undefined {
  if (!event.body) {
    return undefined;
  }
  return parseJsonBody<T>(event);
}

export function getPathParam(event: APIGatewayProxyEvent, paramName: string): string {
  const val = event.pathParameters?.[paramName];
  if (!val) {
    throw new BadRequestError(`Missing required path parameter: ${paramName}`, 'ERR_BAD_REQUEST');
  }
  return decodeURIComponent(val);
}

export function getQueryParam(event: APIGatewayProxyEvent, paramName: string): string | undefined {
  const val = event.queryStringParameters?.[paramName];
  return val !== undefined ? decodeURIComponent(val) : undefined;
}
