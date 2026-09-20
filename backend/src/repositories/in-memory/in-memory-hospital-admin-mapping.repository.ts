import { HospitalAdminMapping } from '../../types/auth.js';
import { IHospitalAdminMappingRepository } from '../interfaces/hospital-admin-mapping.repository.js';
import { SEED_HOSPITAL_ADMIN_MAPPINGS } from './seed-data.js';

export class InMemoryHospitalAdminMappingRepository implements IHospitalAdminMappingRepository {
  private mappings: Map<string, HospitalAdminMapping> = new Map();

  constructor() {
    for (const m of SEED_HOSPITAL_ADMIN_MAPPINGS) {
      this.mappings.set(m.userId, { ...m });
    }
  }

  async getMappingByUserId(userId: string): Promise<HospitalAdminMapping | null> {
    const mapping = this.mappings.get(userId);
    return mapping ? { ...mapping } : null;
  }

  async saveMapping(mapping: HospitalAdminMapping): Promise<void> {
    this.mappings.set(mapping.userId, { ...mapping });
  }
}

export const inMemoryHospitalAdminMappingRepo = new InMemoryHospitalAdminMappingRepository();
