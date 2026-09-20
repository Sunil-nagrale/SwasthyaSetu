import { HospitalAdminMapping } from '../../types/auth.js';

export interface IHospitalAdminMappingRepository {
  getMappingByUserId(userId: string): Promise<HospitalAdminMapping | null>;
  saveMapping(mapping: HospitalAdminMapping): Promise<void>;
}
