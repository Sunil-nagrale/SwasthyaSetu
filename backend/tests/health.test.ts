import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { healthHandler } from '../src/handlers/health.js';
import { APIGatewayProxyEvent } from '../src/types/aws.js';

function createMockEvent(overrides: Partial<APIGatewayProxyEvent> = {}): APIGatewayProxyEvent {
  return {
    body: null,
    headers: {},
    httpMethod: 'GET',
    isBase64Encoded: false,
    path: '/health',
    pathParameters: null,
    queryStringParameters: null,
    requestContext: {
      httpMethod: 'GET',
      path: '/health',
      requestId: 'test-req-001',
    },
    ...overrides,
  };
}

describe('Health Check API Handler', () => {
  test('returns HTTP 200 with healthy status JSON and timestamp', async () => {
    const event = createMockEvent();
    const result = await healthHandler(event);

    assert.equal(result.statusCode, 200);
    assert.equal(result.headers?.['Content-Type'], 'application/json');

    const body = JSON.parse(result.body);
    assert.equal(body.status, 'healthy');
    assert.equal(body.service, 'SwasthyaSetu Backend API');
    assert.equal(body.version, '1.0.0');
    assert.ok(body.timestamp);
    assert.ok(!isNaN(Date.parse(body.timestamp)));
  });
});
