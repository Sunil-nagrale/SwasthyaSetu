import { BadRequestError, ConflictError, UnauthorizedError } from '../utils/errors.js';
import { logger } from '../utils/logger.js';
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

  confirmSignUp(email: string, code: string): Promise<{ confirmed: boolean }>;

  resendConfirmationCode(email: string): Promise<{ sent: boolean }>;

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
      throw new ConflictError('User with this email already exists', 'ERR_USER_EXISTS');
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

  async confirmSignUp(_email: string, _code: string): Promise<{ confirmed: boolean }> {
    return { confirmed: true };
  }

  async resendConfirmationCode(_email: string): Promise<{ sent: boolean }> {
    return { sent: true };
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
    const userAttributes: Array<{ Name: string; Value: string }> = [
      { Name: 'email', Value: email },
      { Name: 'name', Value: name },
    ];

    let cleanPhone = phone?.trim();
    if (cleanPhone) {
      const stripped = cleanPhone.replace(/[\s\-()]/g, '');
      cleanPhone = stripped.startsWith('+') ? stripped : `+91${stripped}`;
      if (/^\+[1-9]\d{6,14}$/.test(cleanPhone)) {
        userAttributes.push({ Name: 'phone_number', Value: cleanPhone });
      }
    }

    let cleanDob = dateOfBirth?.trim();
    if (cleanDob && /^\d{4}-\d{2}-\d{2}$/.test(cleanDob)) {
      userAttributes.push({ Name: 'birthdate', Value: cleanDob });
    }

    try {
      const result = await client.send(
        new SignUpCommand({
          ClientId: env.COGNITO_CLIENT_ID,
          Username: email,
          Password: password,
          UserAttributes: userAttributes,
        })
      );
      let isConfirmed = Boolean(result.UserConfirmed);
      if (!isConfirmed && env.COGNITO_USER_POOL_ID) {
        try {
          const { AdminConfirmSignUpCommand, AdminAddUserToGroupCommand } = await import(
            '@aws-sdk/client-cognito-identity-provider'
          );
          await client.send(
            new AdminConfirmSignUpCommand({
              UserPoolId: env.COGNITO_USER_POOL_ID,
              Username: email,
            })
          );
          isConfirmed = true;
          logger.info('Auto-confirmed newly signed up user', { email });

          try {
            await client.send(
              new AdminAddUserToGroupCommand({
                UserPoolId: env.COGNITO_USER_POOL_ID,
                Username: email,
                GroupName: 'patient',
              })
            );
          } catch (groupErr) {
            logger.warn('Failed to add user to patient group', {
              email,
              error: (groupErr as Error)?.message,
            });
          }
        } catch (confirmErr) {
          logger.warn('Failed to auto-confirm user during sign-up', {
            email,
            error: (confirmErr as Error)?.message,
          });
        }
      }

      return {
        userId: result.UserSub || email,
        isConfirmed,
      };
    } catch (err: unknown) {
      const errorName = (err as { name?: string })?.name || '';
      const errorMessage = (err as Error)?.message || 'Unable to complete sign-up';

      logger.warn('Cognito signUp error', {
        errorName,
        errorMessage,
      });

      if (errorName === 'UsernameExistsException') {
        throw new ConflictError('An account with this email already exists', 'ERR_USER_EXISTS');
      }
      if (errorName === 'InvalidPasswordException') {
        throw new BadRequestError(errorMessage, 'ERR_INVALID_PASSWORD');
      }
      if (errorName === 'InvalidParameterException') {
        throw new BadRequestError(errorMessage, 'ERR_INVALID_PARAMETER');
      }
      if (errorName === 'CodeDeliveryFailureException') {
        throw new BadRequestError(`Failed to deliver verification code: ${errorMessage}`, 'ERR_CODE_DELIVERY');
      }

      throw new BadRequestError(errorMessage, 'ERR_SIGNUP_FAILED');
    }
  }

  async confirmSignUp(email: string, code: string): Promise<{ confirmed: boolean }> {
    const {
      CognitoIdentityProviderClient,
      ConfirmSignUpCommand,
    } = await import('@aws-sdk/client-cognito-identity-provider');
    const client = new CognitoIdentityProviderClient({ region: env.AWS_REGION });
    try {
      await client.send(
        new ConfirmSignUpCommand({
          ClientId: env.COGNITO_CLIENT_ID,
          Username: email,
          ConfirmationCode: code,
        })
      );
      return { confirmed: true };
    } catch (err: unknown) {
      const errorName = (err as { name?: string })?.name || '';
      const errorMessage = (err as Error)?.message || 'Failed to confirm account';
      if (errorName === 'CodeMismatchException') {
        throw new BadRequestError('Invalid verification code. Please check your email.', 'ERR_INVALID_CODE');
      }
      if (errorName === 'ExpiredCodeException') {
        throw new BadRequestError('Verification code has expired. Please request a new code.', 'ERR_EXPIRED_CODE');
      }
      if (errorName === 'NotAuthorizedException') {
        return { confirmed: true };
      }
      throw new BadRequestError(errorMessage, 'ERR_CONFIRMATION_FAILED');
    }
  }

  async resendConfirmationCode(email: string): Promise<{ sent: boolean }> {
    const {
      CognitoIdentityProviderClient,
      ResendConfirmationCodeCommand,
    } = await import('@aws-sdk/client-cognito-identity-provider');
    const client = new CognitoIdentityProviderClient({ region: env.AWS_REGION });
    try {
      await client.send(
        new ResendConfirmationCodeCommand({
          ClientId: env.COGNITO_CLIENT_ID,
          Username: email,
        })
      );
      return { sent: true };
    } catch (err: unknown) {
      throw new BadRequestError((err as Error)?.message || 'Failed to resend verification code', 'ERR_RESEND_FAILED');
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
      let userId = email;
      let roles: UserRole[] = ['patient'];
      try {
        const parts = auth.IdToken.split('.');
        const tokenPayload = parts[1];
        if (tokenPayload) {
          const payload = JSON.parse(Buffer.from(tokenPayload, 'base64url').toString('utf8'));
          if (payload.sub) userId = payload.sub;
          if (Array.isArray(payload['cognito:groups']) && payload['cognito:groups'].length > 0) {
            roles = payload['cognito:groups'] as UserRole[];
          }
        }
      } catch {
        // use defaults
      }

      return {
        accessToken: auth.AccessToken,
        idToken: auth.IdToken,
        refreshToken: auth.RefreshToken || '',
        expiresIn: auth.ExpiresIn || 3600,
        userId,
        email,
        roles,
      };
    } catch (err) {
      if (err instanceof UnauthorizedError) throw err;
      const errorName = (err as { name?: string })?.name || '';
      if (errorName === 'UserNotConfirmedException') {
        if (env.COGNITO_USER_POOL_ID) {
          try {
            const {
              AdminConfirmSignUpCommand,
              AdminAddUserToGroupCommand,
            } = await import('@aws-sdk/client-cognito-identity-provider');
            await client.send(
              new AdminConfirmSignUpCommand({
                UserPoolId: env.COGNITO_USER_POOL_ID,
                Username: email,
              })
            );
            try {
              await client.send(
                new AdminAddUserToGroupCommand({
                  UserPoolId: env.COGNITO_USER_POOL_ID,
                  Username: email,
                  GroupName: 'patient',
                })
              );
            } catch {
              // ignore group add error
            }
            logger.info('Auto-confirmed user during login attempt', { email });

            const retryResult = await client.send(
              new InitiateAuthCommand({
                AuthFlow: 'USER_PASSWORD_AUTH',
                ClientId: env.COGNITO_CLIENT_ID,
                AuthParameters: {
                  USERNAME: email,
                  PASSWORD: password,
                },
              })
            );
            const retryAuth = retryResult.AuthenticationResult;
            if (retryAuth?.AccessToken && retryAuth.IdToken) {
              let retryUserId = email;
              let retryRoles: UserRole[] = ['patient'];
              try {
                const parts = retryAuth.IdToken.split('.');
                const retryTokenPayload = parts[1];
                if (retryTokenPayload) {
                  const payload = JSON.parse(Buffer.from(retryTokenPayload, 'base64url').toString('utf8'));
                  if (payload.sub) retryUserId = payload.sub;
                  if (Array.isArray(payload['cognito:groups']) && payload['cognito:groups'].length > 0) {
                    retryRoles = payload['cognito:groups'] as UserRole[];
                  }
                }
              } catch {}
              return {
                accessToken: retryAuth.AccessToken,
                idToken: retryAuth.IdToken,
                refreshToken: retryAuth.RefreshToken || '',
                expiresIn: retryAuth.ExpiresIn || 3600,
                userId: retryUserId,
                email,
                roles: retryRoles,
              };
            }
          } catch (autoConfirmErr) {
            logger.warn('Failed auto-confirm during login', {
              email,
              error: (autoConfirmErr as Error)?.message,
            });
          }
        }
        throw new UnauthorizedError(
          'User is not confirmed. Please verify your email before logging in.',
          'ERR_USER_NOT_CONFIRMED'
        );
      }
      throw new UnauthorizedError('Incorrect username or password.', 'ERR_UNAUTHORIZED');
    }
  }
}

export const cognitoService: ICognitoService = env.USE_MOCK_AWS
  ? new MockCognitoService()
  : new AwsCognitoService();
