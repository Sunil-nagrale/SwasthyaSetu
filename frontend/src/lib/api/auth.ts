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
    let cleanPhone = payload.phone?.trim();
    if (cleanPhone) {
      const stripped = cleanPhone.replace(/[\s\-()]/g, '');
      cleanPhone = stripped.startsWith('+') ? stripped : `+91${stripped}`;
      if (!/^\+[1-9]\d{6,14}$/.test(cleanPhone)) {
        cleanPhone = undefined;
      }
    }

    return apiClient<SignUpResponse>('/auth/signup', {
      method: 'POST',
      headers: {
        Authorization: '',
      },
      body: JSON.stringify({
        ...payload,
        phone: cleanPhone || undefined,
        dateOfBirth: payload.dateOfBirth || undefined,
      }),
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
