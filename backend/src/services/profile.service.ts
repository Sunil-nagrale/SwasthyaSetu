import { IUserRepository } from '../repositories/interfaces/user.repository.js';
import { userRepo as defaultUserRepo } from '../repositories/container.js';
import { AuthContext, PatientProfile } from '../types/auth.js';
import { UpdateProfileInput } from '../validators/profile.validator.js';
import { NotFoundError } from '../utils/errors.js';

export class ProfileService {
  constructor(private userRepo: IUserRepository = defaultUserRepo) {}

  async getProfile(auth: AuthContext): Promise<PatientProfile> {
    const profile = await this.userRepo.getProfile(auth.userId);
    if (!profile) {
      // Fallback empty profile if user just logged in via Cognito
      return {
        userId: auth.userId,
        name: 'Registered Patient',
        email: auth.email,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
    }
    return profile;
  }

  async updateProfile(auth: AuthContext, input: UpdateProfileInput): Promise<PatientProfile> {
    let profile = await this.userRepo.getProfile(auth.userId);
    const now = new Date().toISOString();

    if (!profile) {
      profile = {
        userId: auth.userId,
        name: input.name || 'Registered Patient',
        email: auth.email,
        phone: input.phone,
        dateOfBirth: input.dateOfBirth,
        gender: input.gender,
        bloodGroup: input.bloodGroup,
        address: input.address,
        emergencyContact: input.emergencyContact,
        createdAt: now,
        updatedAt: now,
      };
    } else {
      profile = {
        ...profile,
        ...input,
        updatedAt: now,
      };
    }

    return this.userRepo.saveProfile(profile);
  }
}

export const profileService = new ProfileService();
