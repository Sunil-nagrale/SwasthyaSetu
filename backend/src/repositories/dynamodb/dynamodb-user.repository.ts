import { PatientProfile } from '../../types/auth.js';
import { IUserRepository } from '../interfaces/user.repository.js';
import { userPk } from './keys.js';
import { getItem, putItem, stripKeys } from './document.js';

export class DynamoUserRepository implements IUserRepository {
  async getProfile(userId: string): Promise<PatientProfile | null> {
    const item = await getItem(userPk(userId), 'PROFILE');
    return item ? stripKeys<PatientProfile>(item) : null;
  }

  async saveProfile(profile: PatientProfile): Promise<PatientProfile> {
    await putItem({
      PK: userPk(profile.userId),
      SK: 'PROFILE',
      entityType: 'profile',
      ...profile,
    });
    return profile;
  }
}

export const dynamoUserRepo = new DynamoUserRepository();
