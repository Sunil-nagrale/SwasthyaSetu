import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  extractAuthContext,
  requireRole,
  assertPatientOwnership,
  resolveHospitalAdminScope,
} from '../src/middleware/auth.middleware.js';
import { inMemoryHospitalAdminMappingRepo } from '../src/repositories/in-memory/in-memory-hospital-admin-mapping.repository.js';
import { SHARDA_HOSPITAL_ID, SHARDA_ADMIN_USER_ID, MAX_HOSPITAL_ID, MAX_ADMIN_USER_ID } from '../src/repositories/in-memory/seed-data.js';
import { ForbiddenError, UnauthorizedError } from '../src/utils/errors.js';
import { APIGatewayProxyEvent } from '../src/types/aws.js';
import { loadEnv } from '../src/config/env.js';

const mockConfig = loadEnv({ NODE_ENV: 'test', USE_MOCK_AWS: 'true' });
const productionConfig = loadEnv({
  NODE_ENV: 'production',
  USE_MOCK_AWS: 'false',
  AWS_REGION: 'ap-south-1',
  COGNITO_USER_POOL_ID: 'ap-south-1_TestPool',
});
const expectedIss = 'https://cognito-idp.ap-south-1.amazonaws.com/ap-south-1_TestPool';

function mockEventWithAuth(
  authHeader: string,
  authorizerClaims?: Record<string, unknown>
): APIGatewayProxyEvent {
  return {
    body: null,
    headers: authHeader ? { Authorization: authHeader } : {},
    httpMethod: 'GET',
    isBase64Encoded: false,
    path: '/test',
    pathParameters: null,
    queryStringParameters: null,
    requestContext: {
      httpMethod: 'GET',
      path: '/test',
      requestId: 'req-auth-test',
      authorizer: authorizerClaims ? { claims: authorizerClaims } : undefined,
    },
  };
}

function unsignedJwt(payload: Record<string, unknown>): string {
  const header = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url');
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  return `${header}.${body}.forged-signature`;
}

describe('Authentication & Scope Enforcement', () => {
  describe('Cognito Role Extraction', () => {
    test('extracts patient role correctly', () => {
      const event = mockEventWithAuth('Bearer mock-patient-user123');
      const auth = extractAuthContext(event, mockConfig);
      assert.equal(auth.userId, 'user123');
      assert.deepEqual(auth.roles, ['patient']);
    });

    test('extracts hospital_admin role correctly', () => {
      const event = mockEventWithAuth(`Bearer mock-hospital-admin-${SHARDA_ADMIN_USER_ID}`);
      const auth = extractAuthContext(event, mockConfig);
      assert.equal(auth.userId, SHARDA_ADMIN_USER_ID);
      assert.deepEqual(auth.roles, ['hospital_admin']);
    });

    test('extracts admin role correctly', () => {
      const event = mockEventWithAuth('Bearer mock-admin-super1');
      const auth = extractAuthContext(event, mockConfig);
      assert.equal(auth.userId, 'super1');
      assert.deepEqual(auth.roles, ['admin']);
    });

    test('throws 401 when Authorization header is missing', () => {
      const event = mockEventWithAuth('');
      delete event.headers.Authorization;
      assert.throws(() => extractAuthContext(event, mockConfig), UnauthorizedError);
    });
  });

  describe('Role Enforcement (requireRole)', () => {
    test('allows access when user has the required role', () => {
      const event = mockEventWithAuth('Bearer mock-patient-1');
      const auth = requireRole(event, ['patient'], mockConfig);
      assert.equal(auth.userId, '1');
    });

    test('throws 403 Forbidden when user lacks the required role', () => {
      const event = mockEventWithAuth('Bearer mock-patient-1');
      assert.throws(
        () => requireRole(event, ['hospital_admin'], mockConfig),
        (err: unknown) => {
          return err instanceof ForbiddenError && err.statusCode === 403;
        }
      );
    });
  });

  describe('Patient Ownership Rules (Contract Section 6)', () => {
    test('passes when auth userId matches resource ownerId', () => {
      const auth = { userId: 'patient-42', email: 'p@test.com', roles: ['patient' as const] };
      assert.doesNotThrow(() => assertPatientOwnership(auth, 'patient-42'));
    });

    test('throws 403 Forbidden when auth userId differs from resource ownerId', () => {
      const auth = { userId: 'patient-attacker', email: 'attacker@test.com', roles: ['patient' as const] };
      assert.throws(
        () => assertPatientOwnership(auth, 'patient-victim'),
        (err: unknown) => {
          return err instanceof ForbiddenError && err.code === 'ERR_OWNERSHIP_VIOLATION';
        }
      );
    });
  });

  describe('Hospital-Admin Server-Side Scope Rules (Contract Section 7)', () => {
    test('resolves assigned hospitalId server-side for Sharda Hospital admin', async () => {
      const auth = {
        userId: SHARDA_ADMIN_USER_ID,
        email: 'sharda-admin@example.com',
        roles: ['hospital_admin' as const],
      };

      const hospitalId = await resolveHospitalAdminScope(auth, inMemoryHospitalAdminMappingRepo);
      assert.equal(hospitalId, SHARDA_HOSPITAL_ID);
      assert.equal(auth.hospitalId, SHARDA_HOSPITAL_ID);
    });

    test('resolves different hospitalId for Max Hospital admin (cross-hospital isolation)', async () => {
      const auth = {
        userId: MAX_ADMIN_USER_ID,
        email: 'max-admin@example.com',
        roles: ['hospital_admin' as const],
      };

      const hospitalId = await resolveHospitalAdminScope(auth, inMemoryHospitalAdminMappingRepo);
      assert.equal(hospitalId, MAX_HOSPITAL_ID);
      assert.notEqual(hospitalId, SHARDA_HOSPITAL_ID);
    });

    test('throws 403 Forbidden if hospital admin account has no server-side mapping', async () => {
      const auth = {
        userId: 'unmapped-admin-user',
        email: 'unmapped@example.com',
        roles: ['hospital_admin' as const],
      };

      await assert.rejects(
        async () => resolveHospitalAdminScope(auth, inMemoryHospitalAdminMappingRepo),
        (err: unknown) => err instanceof ForbiddenError && err.code === 'ERR_SCOPE_VIOLATION'
      );
    });
  });

  describe('Mock-mode unsigned JWT', () => {
    test('accepts unsigned JWT in mock mode when exp is valid', () => {
      const token = unsignedJwt({
        sub: 'patient-jwt-001',
        email: 'jwt@example.com',
        'cognito:groups': ['patient'],
        exp: Math.floor(Date.now() / 1000) + 3600,
      });
      const event = mockEventWithAuth(`Bearer ${token}`);
      const auth = extractAuthContext(event, mockConfig);
      assert.equal(auth.userId, 'patient-jwt-001');
      assert.deepEqual(auth.roles, ['patient']);
    });

    test('rejects expired unsigned JWT in mock mode', () => {
      const token = unsignedJwt({
        sub: 'patient-jwt-001',
        email: 'jwt@example.com',
        'cognito:groups': ['patient'],
        exp: Math.floor(Date.now() / 1000) - 10,
      });
      const event = mockEventWithAuth(`Bearer ${token}`);
      assert.throws(
        () => extractAuthContext(event, mockConfig),
        (err: unknown) => err instanceof UnauthorizedError && err.code === 'ERR_INVALID_TOKEN'
      );
    });
  });

  describe('Non-mock / production authorizer claims', () => {
    test('accepts API Gateway authorizer claims with matching issuer, role, and expiry', () => {
      const event = mockEventWithAuth('', {
        sub: 'cognito-user-1',
        email: 'patient@example.com',
        iss: expectedIss,
        exp: Math.floor(Date.now() / 1000) + 3600,
        token_use: 'id',
        'cognito:groups': 'patient',
      });
      const auth = extractAuthContext(event, productionConfig);
      assert.equal(auth.userId, 'cognito-user-1');
      assert.deepEqual(auth.roles, ['patient']);
    });

    test('accepts authorizer exp claim when API Gateway supplies it as a string', () => {
      const event = mockEventWithAuth('', {
        sub: 'cognito-user-2',
        iss: expectedIss,
        exp: String(Math.floor(Date.now() / 1000) + 3600),
        'cognito:groups': 'hospital_admin',
      });
      const auth = extractAuthContext(event, productionConfig);
      assert.equal(auth.userId, 'cognito-user-2');
      assert.deepEqual(auth.roles, ['hospital_admin']);
    });

    test('accepts authorizer claims when exp is omitted by API Gateway (pre-validated at edge)', () => {
      const event = mockEventWithAuth('', {
        sub: 'cognito-user-3',
        iss: expectedIss,
        'cognito:groups': 'patient',
      });
      const auth = extractAuthContext(event, productionConfig);
      assert.equal(auth.userId, 'cognito-user-3');
      assert.deepEqual(auth.roles, ['patient']);
    });

    test('accepts authorizer claims when cognito:groups is stringified with JSON brackets "[patient]"', () => {
      const event = mockEventWithAuth('', {
        sub: 'cognito-user-4',
        iss: expectedIss,
        'cognito:groups': '["patient"]',
      });
      const auth = extractAuthContext(event, productionConfig);
      assert.equal(auth.userId, 'cognito-user-4');
      assert.deepEqual(auth.roles, ['patient']);
    });

    test('rejects mock Bearer tokens when mock auth is disabled', () => {
      const event = mockEventWithAuth('Bearer mock-admin-super1');
      assert.throws(
        () => extractAuthContext(event, productionConfig),
        (err: unknown) => err instanceof UnauthorizedError && err.code === 'ERR_UNAUTHORIZED'
      );
    });

    test('rejects unsigned/forged JWT in Authorization header when mock auth is disabled', () => {
      const token = unsignedJwt({
        sub: 'attacker',
        email: 'evil@example.com',
        'cognito:groups': ['admin'],
        iss: expectedIss,
        exp: Math.floor(Date.now() / 1000) + 3600,
      });
      const event = mockEventWithAuth(`Bearer ${token}`);
      assert.throws(
        () => extractAuthContext(event, productionConfig),
        (err: unknown) => err instanceof UnauthorizedError && err.code === 'ERR_UNAUTHORIZED'
      );
    });

    test('rejects authorizer claims with wrong issuer', () => {
      const event = mockEventWithAuth('', {
        sub: 'cognito-user-1',
        iss: 'https://cognito-idp.ap-south-1.amazonaws.com/wrong-pool',
        exp: Math.floor(Date.now() / 1000) + 3600,
        'cognito:groups': 'patient',
      });
      assert.throws(
        () => extractAuthContext(event, productionConfig),
        (err: unknown) => err instanceof UnauthorizedError && err.code === 'ERR_INVALID_TOKEN'
      );
    });

    test('rejects expired authorizer claims', () => {
      const event = mockEventWithAuth('', {
        sub: 'cognito-user-1',
        iss: expectedIss,
        exp: Math.floor(Date.now() / 1000) - 30,
        'cognito:groups': 'patient',
      });
      assert.throws(
        () => extractAuthContext(event, productionConfig),
        (err: unknown) => err instanceof UnauthorizedError && err.code === 'ERR_INVALID_TOKEN'
      );
    });

    test('rejects authorizer claims that omit a recognized role (no patient default)', () => {
      const event = mockEventWithAuth('', {
        sub: 'cognito-user-1',
        iss: expectedIss,
        exp: Math.floor(Date.now() / 1000) + 3600,
      });
      assert.throws(
        () => extractAuthContext(event, productionConfig),
        (err: unknown) => err instanceof UnauthorizedError && err.code === 'ERR_INVALID_TOKEN'
      );
    });

    test('rejects forged admin role in authorizer groups that are not a known role set still requires issuer', () => {
      const event = mockEventWithAuth('', {
        sub: 'cognito-user-1',
        iss: expectedIss,
        exp: Math.floor(Date.now() / 1000) + 3600,
        'cognito:groups': 'not_a_real_role',
      });
      assert.throws(
        () => extractAuthContext(event, productionConfig),
        UnauthorizedError
      );
    });
  });
});
