import { apiClient } from './client';
import { OngoingMedication } from '@/types';

export const medicationsApi = {
  async listOngoingMedications(): Promise<OngoingMedication[]> {
    return apiClient<OngoingMedication[]>('/medications');
  },
};
