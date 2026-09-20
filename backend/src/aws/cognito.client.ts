import { UnauthorizedError } from '../utils/errors.js';
import { UserRole } from '../types/auth.js';
import { env } from '../config/env.js';

export interface CognitoTokens {
  accessToken: string;
  idToken: string;
  refreshToken: string;
  expiresIn: number;
  userId: string;
  email: string;
  roles: UserRole[];
}

export interface ICognitoService {
  signUp(
    email: string,
    password: string,
    name: string,
    phone?: string,
    dateOfBirth?: string
  ): Promise<{ userId: string; isConfirmed: boolean }>;

  login(email: string, password: string): Promise<CognitoTokens>;
}

export class MockCognitoService implements ICognitoService {
  private users: Map<
    string,
    { userId: string; email: string; passwordHash: string; name: string; roles: UserRole[] }
  > = new Map();

  constructor() {
    // Seed default demo accounts
    this.users.set('patient@example.com', {
      userId: 'patient-test-001',
      email: 'patient@example.com',
      passwordHash: 'Password123!',
      name: 'Ravi Kumar',
      roles: ['patient'],
    });

    this.users.set('sharda-admin@example.com', {
      userId: 'admin-sharda-001',
      email: 'sharda-admin@example.com',
      passwordHash: 'AdminPassword123!',
      name: 'Sharda Hospital Administrator',
      roles: ['hospital_admin'],
    });

    this.users.set('superadmin@example.com', {
      userId: 'super-admin-001',
      email: 'superadmin@example.com',
      passwordHash: 'SuperAdmin123!',
      name: 'Platform Administrator',
      roles: ['admin'],
    });
  }

  async signUp(
    email: string,
    password: string,
    name: string,
    _phone?: string,
    _dateOfBirth?: string
  ): Promise<{ userId: string; isConfirmed: boolean }> {
    const existing = this.users.get(email.toLowerCase());
    if (existing) {
      throw new UnauthorizedError('User with this email already exists', 'ERR_USER_EXISTS');
    }

    const userId = `usr_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    this.users.set(email.toLowerCase(), {
      userId,
      email: email.toLowerCase(),
      passwordHash: password,
      name,
      roles: ['patient'], // Public sign-up is always patient role as specified
    });

    return {
      userId,
      isConfirmed: true,
    };
  }

  async login(email: string, password: string): Promise<CognitoTokens> {
    const user = this.users.get(email.toLowerCase());
    if (!user || user.passwordHash !== password) {
      throw new UnauthorizedError('Incorrect username or password.', 'ERR_UNAUTHORIZED');
    }

    // Build mock JWT format: header.payload.signature
    const payload = {
      sub: user.userId,
      email: user.email,
      'cognito:groups': user.roles,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 3600,
    };

    const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
    const encodedPayload = Buffer.from(JSON.stringify(payload)).toString('base64url');
    const signature = 'mock_signature';

    const token = `${header}.${encodedPayload}.${signature}`;

    return {
      accessToken: token,
      idToken: token,
      refreshToken: `refresh_${user.userId}`,
      expiresIn: 3600,
      userId: user.userId,
      email: user.email,
      roles: user.roles,
    };
  }
}

export class AwsCognitoService implements ICognitoService {
  async signUp(
    email: string,
    password: string,
    name: string,
    phone?: string,
    dateOfBirth?: string
  ): Promise<{ userId: string; isConfirmed: boolean }> {
    const { CognitoIdentityProviderClient, SignUpCommand } = await import(
      '@aws-sdk/client-cognito-identity-provider'
    );
    const client = new CognitoIdentityProviderClient({ region: env.AWS_REGION });
    const userAttributes = [
      { Name: 'email', Value: email },
      { Name: 'name', Value: name },
    ];
    if (phone) userAttributes.push({ Name: 'phone_number', Value: phone });
    if (dateOfBirth) userAttributes.push({ Name: 'birthdate', Value: dateOfBirth });

    try {
      const result = await client.send(
        new SignUpCommand({
          ClientId: env.COGNITO_CLIENT_ID,
          Username: email,
          Password: password,
          UserAttributes: userAttributes,
        })
      );
      return {
        userId: result.UserSub || email,
        isConfirmed: Boolean(result.UserConfirmed),
      };
    } catch {
      throw new UnauthorizedError('Unable to complete sign-up', 'ERR_UNAUTHORIZED');
    }
  }

  async login(email: string, password: string): Promise<CognitoTokens> {
    const {
      CognitoIdentityProviderClient,
      InitiateAuthCommand,
    } = await import('@aws-sdk/client-cognito-identity-provider');
    const client = new CognitoIdentityProviderClient({ region: env.AWS_REGION });
    try {
      const result = await client.send(
        new InitiateAuthCommand({
          AuthFlow: 'USER_PASSWORD_AUTH',
          ClientId: env.COGNITO_CLIENT_ID,
          AuthParameters: {
            USERNAME: email,
            PASSWORD: password,
          },
        })
      );
      const auth = result.AuthenticationResult;
      if (!auth?.AccessToken || !auth.IdToken) {
        throw new UnauthorizedError('Incorrect username or password.', 'ERR_UNAUTHORIZED');
      }
      return {
        accessToken: auth.AccessToken,
        idToken: auth.IdToken,
        refreshToken: auth.RefreshToken || '',
        expiresIn: auth.ExpiresIn || 3600,
        userId: email,
        email,
        roles: ['patient'],
      };
    } catch (err) {
      if (err instanceof UnauthorizedError) throw err;
      throw new UnauthorizedError('Incorrect username or password.', 'ERR_UNAUTHORIZED');
    }
  }
}

export const cognitoService: ICognitoService = env.USE_MOCK_AWS
  ? new MockCognitoService()
  : new AwsCognitoService();
