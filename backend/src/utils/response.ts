import { APIGatewayProxyResult } from '../types/aws.js';
import { ApiErrorResponse } from '../types/api.js';

const CORS_HEADERS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type,Authorization,X-Amz-Date,X-Api-Key,X-Amz-Security-Token',
  'Access-Control-Allow-Methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS',
};

export function jsonResponse(
  statusCode: number,
  body: unknown,
  customHeaders?: Record<string, string>
): APIGatewayProxyResult {
  return {
    statusCode,
    headers: {
      ...CORS_HEADERS,
      ...customHeaders,
    },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  };
}

export function ok<T>(data: T, customHeaders?: Record<string, string>): APIGatewayProxyResult {
  return jsonResponse(200, data, customHeaders);
}

export function created<T>(data: T, customHeaders?: Record<string, string>): APIGatewayProxyResult {
  return jsonResponse(201, data, customHeaders);
}

export function noContent(customHeaders?: Record<string, string>): APIGatewayProxyResult {
  return {
    statusCode: 204,
    headers: {
      ...CORS_HEADERS,
      ...customHeaders,
    },
    body: '',
  };
}

export function errorResponse(
  statusCode: number,
  code: string,
  message: string,
  customHeaders?: Record<string, string>
): APIGatewayProxyResult {
  const errorBody: ApiErrorResponse = {
    error: {
      code,
      message,
    },
  };
  return jsonResponse(statusCode, errorBody, customHeaders);
}
