import { apiClient } from './client';
import { AuthUser, PatientProfile } from '@/types';

export interface LoginResponse {
  accessToken: string;
  idToken: string;
  refreshToken: string;
  expiresIn: number;
  userId: string;
  email: string;
  roles: string[];
}

export interface SignUpPayload {
  email: string;
  password: string;
  name: string;
  phone?: string;
  dateOfBirth?: string;
}

export interface SignUpResponse {
  userId: string;
  isConfirmed: boolean;
}

export const authApi = {
  async login(payload: { email: string; password: string }): Promise<LoginResponse> {
    return apiClient<LoginResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async signUp(payload: SignUpPayload): Promise<SignUpResponse> {
    return apiClient<SignUpResponse>('/auth/signup', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async getProfile(): Promise<PatientProfile> {
    return apiClient<PatientProfile>('/profile', {
      method: 'GET',
    });
  },

  async updateProfile(payload: Partial<PatientProfile>): Promise<PatientProfile> {
    return apiClient<PatientProfile>('/profile', {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  },
};
