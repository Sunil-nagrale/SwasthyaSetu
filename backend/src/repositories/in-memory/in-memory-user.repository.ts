import { PatientProfile } from '../../types/auth.js';
import { IUserRepository } from '../interfaces/user.repository.js';
import { SEED_PATIENT_PROFILES } from './seed-data.js';

export class InMemoryUserRepository implements IUserRepository {
  private profiles: Map<string, PatientProfile> = new Map();

  constructor() {
    for (const p of SEED_PATIENT_PROFILES) {
      this.profiles.set(p.userId, { ...p });
    }
  }

  async getProfile(userId: string): Promise<PatientProfile | null> {
    const p = this.profiles.get(userId);
    return p ? { ...p } : null;
  }

  async saveProfile(profile: PatientProfile): Promise<PatientProfile> {
    const updated = { ...profile, updatedAt: new Date().toISOString() };
    this.profiles.set(profile.userId, updated);
    return { ...updated };
  }
}

export const inMemoryUserRepo = new InMemoryUserRepository();
