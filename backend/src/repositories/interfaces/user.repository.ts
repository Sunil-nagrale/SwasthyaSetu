import { PatientProfile } from '../../types/auth.js';

export interface IUserRepository {
  getProfile(userId: string): Promise<PatientProfile | null>;
  saveProfile(profile: PatientProfile): Promise<PatientProfile>;
}
