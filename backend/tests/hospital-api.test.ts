import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  searchHospitalsHandler,
  getHospitalDetailsHandler,
  getDepartmentsHandler,
  getDepartmentDetailsHandler,
} from '../src/handlers/hospitals.js';
import { SHARDA_HOSPITAL_ID } from '../src/repositories/in-memory/seed-data.js';
import { APIGatewayProxyEvent } from '../src/types/aws.js';

function createMockHospitalEvent(
  pathParams: Record<string, string> | null = null,
  queryParams: Record<string, string> | null = null
): APIGatewayProxyEvent {
  return {
    body: null,
    headers: {},
    httpMethod: 'GET',
    isBase64Encoded: false,
    path: '/hospitals',
    pathParameters: pathParams,
    queryStringParameters: queryParams,
    requestContext: { httpMethod: 'GET', path: '/hospitals', requestId: 'req-hosp-01' },
  };
}

describe('Public Hospital APIs (Contract Section 3)', () => {
  test('GET /hospitals returns paginated hospital list with totalCount', async () => {
    const event = createMockHospitalEvent(null, { page: '1', pageSize: '5' });
    const res = await searchHospitalsHandler(event);

    assert.equal(res.statusCode, 200);
    const body = JSON.parse(res.body);
    assert.ok(body.totalCount >= 10);
    assert.equal(body.page, 1);
    assert.equal(body.pageSize, 5);
    assert.equal(body.items.length, 5);
    assert.ok(body.items[0]?.name);
  });

  test('GET /hospitals filters by city and hospital type', async () => {
    const event = createMockHospitalEvent(null, { city: 'Greater Noida', type: 'government' });
    const res = await searchHospitalsHandler(event);

    assert.equal(res.statusCode, 200);
    const body = JSON.parse(res.body);
    assert.ok(body.items.length > 0);
    for (const h of body.items) {
      assert.equal(h.type, 'government');
      assert.ok(h.city.toLowerCase().includes('greater noida'));
    }
  });

  test('GET /hospitals/{hospitalId} returns detailed hospital profile', async () => {
    const event = createMockHospitalEvent({ hospitalId: SHARDA_HOSPITAL_ID });
    const res = await getHospitalDetailsHandler(event);

    assert.equal(res.statusCode, 200);
    const body = JSON.parse(res.body);
    assert.equal(body.hospitalId, SHARDA_HOSPITAL_ID);
    assert.equal(body.name, 'Sharda Hospital');
    assert.ok(body.specialties.includes('Cardiology'));
  });

  test('GET /hospitals/{hospitalId} returns 404 for non-existent hospital', async () => {
    const event = createMockHospitalEvent({ hospitalId: 'non-existent-id' });
    const res = await getHospitalDetailsHandler(event);

    assert.equal(res.statusCode, 404);
    const body = JSON.parse(res.body);
    assert.equal(body.error.code, 'ERR_NOT_FOUND');
  });

  test('GET /hospitals/{hospitalId}/departments returns departments list', async () => {
    const event = createMockHospitalEvent({ hospitalId: SHARDA_HOSPITAL_ID });
    const res = await getDepartmentsHandler(event);

    assert.equal(res.statusCode, 200);
    const body = JSON.parse(res.body);
    assert.ok(Array.isArray(body));
    assert.ok(body.length >= 3);
    assert.ok(body.some((d: any) => d.name === 'Cardiology'));
  });

  test('GET /hospitals/{hospitalId}/departments/{departmentId} returns department and doctors', async () => {
    const event = createMockHospitalEvent({
      hospitalId: SHARDA_HOSPITAL_ID,
      departmentId: 'dept-sharda-cardio-01',
    });
    const res = await getDepartmentDetailsHandler(event);

    assert.equal(res.statusCode, 200);
    const body = JSON.parse(res.body);
    assert.equal(body.department.name, 'Cardiology');
    assert.ok(Array.isArray(body.doctors));
    assert.ok(body.doctors.some((doc: any) => doc.name === 'Dr. Ramesh Sharma'));
  });
});
