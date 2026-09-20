import { apiClient } from './client';
import { Hospital, Department, Doctor, LabTest, PaginatedResult, DoctorAvailabilitySlot } from '@/types';

export interface HospitalSearchParams {
  city?: string;
  type?: 'government' | 'private';
  specialty?: string;
  query?: string;
  page?: number;
  pageSize?: number;
}

export interface DepartmentDetails extends Department {
  doctors?: Doctor[];
}

export interface HospitalWithDetails extends Hospital {
  departments?: Department[];
  doctors?: Doctor[];
  labTests?: LabTest[];
}

export const hospitalsApi = {
  async searchHospitals(params: HospitalSearchParams = {}): Promise<PaginatedResult<Hospital>> {
    const query = new URLSearchParams();
    if (params.city) query.set('city', params.city);
    if (params.type) query.set('type', params.type);
    if (params.specialty) query.set('specialty', params.specialty);
    if (params.query) query.set('query', params.query);
    if (params.page) query.set('page', String(params.page));
    if (params.pageSize) query.set('pageSize', String(params.pageSize));

    const queryString = query.toString();
    const endpoint = queryString ? `/hospitals?${queryString}` : '/hospitals';
    return apiClient<PaginatedResult<Hospital>>(endpoint);
  },

  async getHospitalById(hospitalId: string): Promise<HospitalWithDetails> {
    return apiClient<HospitalWithDetails>(`/hospitals/${hospitalId}`);
  },

  async getDepartments(hospitalId: string): Promise<Department[]> {
    return apiClient<Department[]>(`/hospitals/${hospitalId}/departments`);
  },

  async getDepartmentDetails(hospitalId: string, departmentId: string): Promise<DepartmentDetails> {
    return apiClient<DepartmentDetails>(`/hospitals/${hospitalId}/departments/${departmentId}`);
  },

  async getDoctors(hospitalId: string): Promise<Doctor[]> {
    return apiClient<Doctor[]>(`/hospitals/${hospitalId}/doctors`);
  },

  async getLabTests(hospitalId: string): Promise<LabTest[]> {
    return apiClient<LabTest[]>(`/hospitals/${hospitalId}/labs`);
  },

  async getDoctorAvailability(
    hospitalId: string,
    doctorId: string,
    date: string
  ): Promise<DoctorAvailabilitySlot> {
    return apiClient<DoctorAvailabilitySlot>(
      `/hospitals/${hospitalId}/doctors/${doctorId}/availability?date=${encodeURIComponent(date)}`
    );
  },
};
