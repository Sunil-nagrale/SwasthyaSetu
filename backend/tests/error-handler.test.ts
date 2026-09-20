import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { withErrorHandler } from '../src/middleware/error.middleware.js';
import {
  BadRequestError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  ConflictError,
  IllegalStateTransitionError,
} from '../src/utils/errors.js';
import { APIGatewayProxyEvent } from '../src/types/aws.js';
import { z } from 'zod';

function dummyEvent(): APIGatewayProxyEvent {
  return {
    body: null,
    headers: {},
    httpMethod: 'GET',
    isBase64Encoded: false,
    path: '/test',
    pathParameters: null,
    queryStringParameters: null,
    requestContext: { httpMethod: 'GET', path: '/test', requestId: 'err-test-01' },
  };
}

describe('Standardized Error Handling (Contract Section 17)', () => {
  test('formats BadRequestError as HTTP 400 with { error: { code, message } }', async () => {
    const handler = withErrorHandler(async () => {
      throw new BadRequestError('Invalid input provided', 'ERR_BAD_REQUEST');
    });

    const res = await handler(dummyEvent());
    assert.equal(res.statusCode, 400);

    const body = JSON.parse(res.body);
    assert.deepEqual(body, {
      error: {
        code: 'ERR_BAD_REQUEST',
        message: 'Invalid input provided',
      },
    });
  });

  test('formats UnauthorizedError as HTTP 401', async () => {
    const handler = withErrorHandler(async () => {
      throw new UnauthorizedError('Missing authentication token', 'ERR_UNAUTHORIZED');
    });

    const res = await handler(dummyEvent());
    assert.equal(res.statusCode, 401);
    const body = JSON.parse(res.body);
    assert.equal(body.error.code, 'ERR_UNAUTHORIZED');
  });

  test('formats ForbiddenError as HTTP 403', async () => {
    const handler = withErrorHandler(async () => {
      throw new ForbiddenError('Access to another patient record forbidden', 'ERR_OWNERSHIP_VIOLATION');
    });

    const res = await handler(dummyEvent());
    assert.equal(res.statusCode, 403);
    const body = JSON.parse(res.body);
    assert.equal(body.error.code, 'ERR_OWNERSHIP_VIOLATION');
  });

  test('formats NotFoundError as HTTP 404', async () => {
    const handler = withErrorHandler(async () => {
      throw new NotFoundError('Hospital not found', 'ERR_NOT_FOUND');
    });

    const res = await handler(dummyEvent());
    assert.equal(res.statusCode, 404);
    const body = JSON.parse(res.body);
    assert.equal(body.error.code, 'ERR_NOT_FOUND');
  });

  test('formats ConflictError as HTTP 409', async () => {
    const handler = withErrorHandler(async () => {
      throw new ConflictError('Record already exists', 'ERR_CONFLICT');
    });

    const res = await handler(dummyEvent());
    assert.equal(res.statusCode, 409);
    const body = JSON.parse(res.body);
    assert.equal(body.error.code, 'ERR_CONFLICT');
  });

  test('formats IllegalStateTransitionError as HTTP 400 with ERR_INVALID_STATE_TRANSITION', async () => {
    const handler = withErrorHandler(async () => {
      throw new IllegalStateTransitionError('Cannot transition from accepted to pending');
    });

    const res = await handler(dummyEvent());
    assert.equal(res.statusCode, 400);
    const body = JSON.parse(res.body);
    assert.equal(body.error.code, 'ERR_INVALID_STATE_TRANSITION');
  });

  test('formats Zod validation error as HTTP 400 with ERR_VALIDATION', async () => {
    const schema = z.object({ age: z.number().min(18) });
    const handler = withErrorHandler(async () => {
      schema.parse({ age: 12 });
      return { statusCode: 200, body: '{}' };
    });

    const res = await handler(dummyEvent());
    assert.equal(res.statusCode, 400);
    const body = JSON.parse(res.body);
    assert.equal(body.error.code, 'ERR_VALIDATION');
    assert.ok(body.error.message.includes('age'));
  });

  test('formats unknown errors as safe HTTP 500 without leaking stack traces', async () => {
    const handler = withErrorHandler(async () => {
      throw new Error('Database connection failed / secret-key: abc123xyz');
    });

    const res = await handler(dummyEvent());
    assert.equal(res.statusCode, 500);
    const body = JSON.parse(res.body);
    assert.equal(body.error.code, 'ERR_INTERNAL_SERVER_ERROR');
    assert.equal(body.error.message, 'An unexpected internal server error occurred');
    assert.ok(!res.body.includes('abc123xyz'));
  });
});
