import { HospitalAdminMapping } from '../../types/auth.js';
import { IHospitalAdminMappingRepository } from '../interfaces/hospital-admin-mapping.repository.js';
import { userPk } from './keys.js';
import { getItem, putItem, stripKeys } from './document.js';

export class DynamoHospitalAdminMappingRepository implements IHospitalAdminMappingRepository {
  async getMappingByUserId(userId: string): Promise<HospitalAdminMapping | null> {
    const item = await getItem(userPk(userId), 'HOSPITAL_ADMIN_MAPPING');
    return item ? stripKeys<HospitalAdminMapping>(item) : null;
  }

  async saveMapping(mapping: HospitalAdminMapping): Promise<void> {
    await putItem({
      PK: userPk(mapping.userId),
      SK: 'HOSPITAL_ADMIN_MAPPING',
      GSI1PK: `hospital#${mapping.hospitalId}`,
      GSI1SK: `admin#${mapping.userId}`,
      entityType: 'hospital_admin_mapping',
      ...mapping,
    });
  }
}

export const dynamoHospitalAdminMappingRepo = new DynamoHospitalAdminMappingRepository();
