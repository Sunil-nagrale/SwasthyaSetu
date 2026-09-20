import { APIGatewayProxyEvent } from '../types/aws.js';
import { AuthContext, UserRole } from '../types/auth.js';
import { UnauthorizedError, ForbiddenError } from '../utils/errors.js';
import { IHospitalAdminMappingRepository } from '../repositories/interfaces/hospital-admin-mapping.repository.js';
import { EnvConfig, env, cognitoIssuer, isMockAuthEnabled } from '../config/env.js';

const KNOWN_ROLES: readonly UserRole[] = ['patient', 'hospital_admin', 'admin'];

function parseRoles(
  rawGroups: unknown,
  customRole?: unknown
): UserRole[] {
  let candidates: string[] = [];
  if (Array.isArray(rawGroups)) {
    candidates = rawGroups.map((g) => String(g).trim());
  } else if (typeof rawGroups === 'string' && rawGroups.trim().length > 0) {
    // API Gateway authorizer stringifies JSON arrays as "[patient]" or "patient"
    const cleaned = rawGroups.replace(/[\[\]"']/g, '');
    candidates = cleaned.split(',').map((g) => g.trim());
  } else if (typeof customRole === 'string' && customRole.trim().length > 0) {
    candidates = [customRole.trim()];
  }

  return candidates.filter((r): r is UserRole => (KNOWN_ROLES as readonly string[]).includes(r));
}

function parseExp(exp: unknown): number | undefined {
  if (typeof exp === 'number' && Number.isFinite(exp)) {
    return exp;
  }
  if (typeof exp === 'string') {
    const trimmed = exp.trim();
    if (/^\d+$/.test(trimmed)) {
      return Number(trimmed);
    }
    const parsedDate = Date.parse(trimmed);
    if (!isNaN(parsedDate)) {
      return Math.floor(parsedDate / 1000);
    }
  }
  return undefined;
}

function assertNotExpired(exp: unknown): void {
  if (exp === undefined || exp === null || exp === '') {
    return;
  }
  const expSeconds = parseExp(exp);
  if (expSeconds !== undefined) {
    const nowSeconds = Math.floor(Date.now() / 1000);
    if (expSeconds <= nowSeconds) {
      throw new UnauthorizedError('Authentication token has expired', 'ERR_INVALID_TOKEN');
    }
  }
}

function authFromClaims(
  claims: Record<string, unknown>,
  config: EnvConfig,
  options: { requireCognitoIssuer: boolean; defaultPatientIfNoRole: boolean }
): AuthContext {
  const sub = claims.sub;
  if (typeof sub !== 'string' || !sub) {
    throw new UnauthorizedError('Invalid token: missing sub claim', 'ERR_INVALID_TOKEN');
  }

  if (options.requireCognitoIssuer) {
    const iss = claims.iss;
    const expectedIss = cognitoIssuer(config);
    if (typeof iss !== 'string' || iss !== expectedIss) {
      throw new UnauthorizedError('Invalid token issuer', 'ERR_INVALID_TOKEN');
    }
  }

  if (claims.exp !== undefined) {
    assertNotExpired(claims.exp);
  }

  const tokenUse = claims.token_use;
  if (tokenUse !== undefined && tokenUse !== 'id' && tokenUse !== 'access') {
    throw new UnauthorizedError('Invalid token use', 'ERR_INVALID_TOKEN');
  }

  const roles = parseRoles(claims['cognito:groups'] ?? claims.groups ?? claims.role, claims['custom:role']);
  if (roles.length === 0) {
    if (!options.defaultPatientIfNoRole) {
      throw new UnauthorizedError('Invalid token: missing recognized Cognito group/role', 'ERR_INVALID_TOKEN');
    }
    roles.push('patient');
  }

  return {
    userId: sub,
    email: typeof claims.email === 'string' ? claims.email : '',
    roles,
  };
}

function extractMockBearerAuth(token: string): AuthContext {
  if (token.startsWith('mock-patient-')) {
    const id = token.replace('mock-patient-', '');
    return {
      userId: id || 'patient-123',
      email: 'patient@example.com',
      roles: ['patient'],
    };
  }

  if (token.startsWith('mock-hospital-admin-')) {
    const id = token.replace('mock-hospital-admin-', '');
    return {
      userId: id || 'admin-user-1',
      email: 'sharda-admin@example.com',
      roles: ['hospital_admin'],
    };
  }

  if (token.startsWith('mock-admin-')) {
    const id = token.replace('mock-admin-', '');
    return {
      userId: id || 'super-admin-1',
      email: 'superadmin@example.com',
      roles: ['admin'],
    };
  }

  const parts = token.split('.');
  if (parts.length === 3 && parts[1]) {
    const payloadJson = Buffer.from(parts[1], 'base64url').toString('utf-8');
    const payload = JSON.parse(payloadJson) as Record<string, unknown>;
    const sub = payload.sub || payload.userId;
    if (typeof sub !== 'string' || !sub) {
      throw new UnauthorizedError('Invalid JWT: missing sub claim', 'ERR_INVALID_TOKEN');
    }

    return authFromClaims(
      { ...payload, sub },
      env,
      { requireCognitoIssuer: false, defaultPatientIfNoRole: true }
    );
  }

  throw new UnauthorizedError('Invalid authentication token', 'ERR_INVALID_TOKEN');
}

/**
 * Resolves the caller identity.
 *
 * Mock mode (USE_MOCK_AWS and NODE_ENV !== production):
 *   mock-* Bearer tokens and unsigned three-part JWTs (expiration still enforced).
 *
 * Non-mock / production:
 *   Requires API Gateway authorizer claims with matching Cognito issuer, expiry, and role.
 *   This does NOT cryptographically verify JWT signatures. Signature verification must be
 *   performed by a Cognito JWT authorizer on API Gateway (not implemented in this repo).
 */
export function extractAuthContext(
  event: APIGatewayProxyEvent,
  config: EnvConfig = env
): AuthContext {
  const mockAuth = isMockAuthEnabled(config);
  const claims = event.requestContext.authorizer?.claims as Record<string, unknown> | undefined;

  if (!mockAuth) {
    if (!claims || typeof claims !== 'object') {
      throw new UnauthorizedError(
        'Missing verified API Gateway authorizer claims',
        'ERR_UNAUTHORIZED'
      );
    }
    return authFromClaims(claims, config, {
      requireCognitoIssuer: true,
      defaultPatientIfNoRole: false,
    });
  }

  if (claims && typeof claims === 'object' && typeof claims.sub === 'string' && claims.sub) {
    return authFromClaims(claims, config, {
      requireCognitoIssuer: false,
      defaultPatientIfNoRole: true,
    });
  }

  const authHeader = event.headers.Authorization || event.headers.authorization;

  if (!authHeader) {
    throw new UnauthorizedError('Missing Authorization header', 'ERR_UNAUTHORIZED');
  }

  const [scheme, token] = authHeader.split(' ');
  if (scheme !== 'Bearer' || !token) {
    throw new UnauthorizedError('Invalid Authorization header format. Expected Bearer <token>', 'ERR_UNAUTHORIZED');
  }

  try {
    return extractMockBearerAuth(token);
  } catch (e) {
    if (e instanceof UnauthorizedError) throw e;
    throw new UnauthorizedError('Invalid or corrupted token', 'ERR_INVALID_TOKEN');
  }
}

export function requireRole(
  event: APIGatewayProxyEvent,
  allowedRoles: UserRole[],
  config: EnvConfig = env
): AuthContext {
  const auth = extractAuthContext(event, config);
  const hasRole = auth.roles.some((r) => allowedRoles.includes(r));
  if (!hasRole) {
    throw new ForbiddenError(
      `Forbidden: requires one of [${allowedRoles.join(', ')}] role`,
      'ERR_FORBIDDEN'
    );
  }
  return auth;
}

export function assertPatientOwnership(auth: AuthContext, resourceOwnerId: string): void {
  if (auth.userId !== resourceOwnerId) {
    throw new ForbiddenError(
      "Forbidden: patient data ownership violation. Cannot access another user's records.",
      'ERR_OWNERSHIP_VIOLATION'
    );
  }
}

export async function resolveHospitalAdminScope(
  auth: AuthContext,
  mappingRepo: IHospitalAdminMappingRepository
): Promise<string> {
  if (!auth.roles.includes('hospital_admin')) {
    throw new ForbiddenError('Forbidden: hospital_admin role required', 'ERR_FORBIDDEN');
  }

  const mapping = await mappingRepo.getMappingByUserId(auth.userId);
  if (!mapping) {
    throw new ForbiddenError(
      'Forbidden: no hospital mapping found for this administrator account',
      'ERR_SCOPE_VIOLATION'
    );
  }

  auth.hospitalId = mapping.hospitalId;
  return mapping.hospitalId;
}
