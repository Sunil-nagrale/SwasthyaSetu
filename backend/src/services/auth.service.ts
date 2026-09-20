import { ICognitoService, CognitoTokens } from '../aws/cognito.client.js';
import { IUserRepository } from '../repositories/interfaces/user.repository.js';
import {
  cognitoService as defaultCognitoService,
  userRepo as defaultUserRepo,
} from '../repositories/container.js';
import { SignUpInput, LoginInput } from '../validators/profile.validator.js';

export class AuthService {
  constructor(
    private cognito: ICognitoService = defaultCognitoService,
    private userRepo: IUserRepository = defaultUserRepo
  ) {}

  async signUp(input: SignUpInput): Promise<{ userId: string; isConfirmed: boolean }> {
    const res = await this.cognito.signUp(
      input.email,
      input.password,
      input.name,
      input.phone,
      input.dateOfBirth
    );

    const now = new Date().toISOString();
    await this.userRepo.saveProfile({
      userId: res.userId,
      name: input.name,
      email: input.email,
      phone: input.phone,
      dateOfBirth: input.dateOfBirth,
      createdAt: now,
      updatedAt: now,
    });

    return res;
  }

  async login(input: LoginInput): Promise<CognitoTokens> {
    return this.cognito.login(input.email, input.password);
  }
}

export const authService = new AuthService();
