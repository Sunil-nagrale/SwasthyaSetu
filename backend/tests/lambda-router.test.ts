import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { handler } from '../src/lambda.js';
import type { APIGatewayProxyEvent } from '../src/types/aws.js';
import { SHARDA_HOSPITAL_ID } from '../src/repositories/in-memory/seed-data.js';

function lambdaEvent(
  method: string,
  path: string,
  overrides: Partial<APIGatewayProxyEvent> = {}
): APIGatewayProxyEvent {
  return {
    body: null,
    headers: {},
    httpMethod: method,
    isBase64Encoded: false,
    path,
    pathParameters: null,
    queryStringParameters: null,
    requestContext: {
      httpMethod: method,
      path,
      requestId: 'lambda-router-test',
    },
    ...overrides,
  };
}

describe('Lambda dispatcher routing', () => {
  test('GET /hospitals dispatches to the public search handler', async () => {
    const res = await handler(lambdaEvent('GET', '/hospitals', {
      queryStringParameters: { page: '1', pageSize: '5' },
    }));
    assert.equal(res.statusCode, 200);
    const body = JSON.parse(res.body);
    assert.ok(body.totalCount >= 10);
    assert.equal(body.items.length, 5);
  });

  test('GET /hospitals/{hospitalId} extracts hospitalId path parameter', async () => {
    const res = await handler(
      lambdaEvent('GET', `/hospitals/${SHARDA_HOSPITAL_ID}`)
    );
    assert.equal(res.statusCode, 200);
    const body = JSON.parse(res.body);
    assert.equal(body.hospitalId, SHARDA_HOSPITAL_ID);
    assert.equal(body.name, 'Sharda Hospital');
  });

  test('GET /hospitals/{hospitalId}/departments/{departmentId} extracts nested path parameters', async () => {
    const res = await handler(
      lambdaEvent(
        'GET',
        `/hospitals/${SHARDA_HOSPITAL_ID}/departments/dept-sharda-cardio-01`
      )
    );
    assert.equal(res.statusCode, 200);
    const body = JSON.parse(res.body);
    assert.equal(body.department.name, 'Cardiology');
    assert.ok(Array.isArray(body.doctors));
  });

  test('PATCH /admin/appointments/{appointmentId} matches the frozen catalog path', async () => {
    const res = await handler(
      lambdaEvent('PATCH', '/admin/appointments/appt-test-001', {
        body: JSON.stringify({ status: 'accepted' }),
      })
    );
    assert.equal(res.statusCode, 401);
    const body = JSON.parse(res.body);
    assert.equal(body.error.code, 'ERR_UNAUTHORIZED');
  });

  test('PATCH /admin/appointments/{appointmentId}/status is no longer routed', async () => {
    const res = await handler(
      lambdaEvent('PATCH', '/admin/appointments/appt-test-001/status', {
        body: JSON.stringify({ status: 'accepted' }),
      })
    );
    assert.equal(res.statusCode, 404);
    const body = JSON.parse(res.body);
    assert.equal(body.error.code, 'NOT_FOUND');
  });

  test('OPTIONS preflight returns 204 with CORS headers', async () => {
    const res = await handler(lambdaEvent('OPTIONS', '/hospitals'));
    assert.equal(res.statusCode, 204);
    assert.equal(res.headers?.['Access-Control-Allow-Origin'], '*');
    assert.equal(
      res.headers?.['Access-Control-Allow-Methods'],
      'GET,POST,PUT,PATCH,DELETE,OPTIONS'
    );
    assert.ok(
      String(res.headers?.['Access-Control-Allow-Headers'] ?? '').includes('Authorization')
    );
  });

  test('unmatched routes return 404 Route not found', async () => {
    const res = await handler(lambdaEvent('GET', '/not-a-real-route'));
    assert.equal(res.statusCode, 404);
    const body = JSON.parse(res.body);
    assert.equal(body.error.code, 'NOT_FOUND');
    assert.equal(body.error.message, 'Route not found');
  });

  test('protected catalog routes are dispatched (auth still enforced)', async () => {
    const prescriptions = await handler(lambdaEvent('GET', '/prescriptions'));
    assert.equal(prescriptions.statusCode, 401);

    const chatbot = await handler(
      lambdaEvent('POST', '/chatbot/hospital', {
        body: JSON.stringify({ hospitalId: SHARDA_HOSPITAL_ID, query: 'hours' }),
      })
    );
    assert.equal(chatbot.statusCode, 401);

    const diagnosis = await handler(
      lambdaEvent('POST', '/diagnosis/symptom', {
        body: JSON.stringify({ symptoms: 'mild knee stiffness for two weeks' }),
      })
    );
    assert.equal(diagnosis.statusCode, 200);
  });
});
