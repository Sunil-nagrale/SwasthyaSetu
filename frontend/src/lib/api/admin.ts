import { apiClient } from './client';
import { Hospital, Department, Doctor, Schedule, LabTest } from '@/types';

export const adminApi = {
  // Hospitals
  async listHospitals(): Promise<Hospital[]> {
    return apiClient<Hospital[]>('/admin/hospitals');
  },
  async getHospital(hospitalId: string): Promise<Hospital> {
    return apiClient<Hospital>(`/admin/hospitals/${hospitalId}`);
  },
  async createHospital(payload: Partial<Hospital>): Promise<Hospital> {
    return apiClient<Hospital>('/admin/hospitals', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },
  async updateHospital(hospitalId: string, payload: Partial<Hospital>): Promise<Hospital> {
    return apiClient<Hospital>(`/admin/hospitals/${hospitalId}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  },
  async deleteHospital(hospitalId: string): Promise<void> {
    return apiClient<void>(`/admin/hospitals/${hospitalId}`, {
      method: 'DELETE',
    });
  },

  // Departments
  async listDepartments(hospitalId?: string): Promise<Department[]> {
    const query = hospitalId ? `?hospitalId=${encodeURIComponent(hospitalId)}` : '';
    return apiClient<Department[]>(`/admin/departments${query}`);
  },
  async createDepartment(payload: Partial<Department>): Promise<Department> {
    return apiClient<Department>('/admin/departments', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },
  async updateDepartment(departmentId: string, payload: Partial<Department>): Promise<Department> {
    return apiClient<Department>(`/admin/departments/${departmentId}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  },
  async deleteDepartment(departmentId: string): Promise<void> {
    return apiClient<void>(`/admin/departments/${departmentId}`, {
      method: 'DELETE',
    });
  },

  // Doctors
  async listDoctors(hospitalId?: string, departmentId?: string): Promise<Doctor[]> {
    const params = new URLSearchParams();
    if (hospitalId) params.set('hospitalId', hospitalId);
    if (departmentId) params.set('departmentId', departmentId);
    const qs = params.toString() ? `?${params.toString()}` : '';
    return apiClient<Doctor[]>(`/admin/doctors${qs}`);
  },
  async createDoctor(payload: Partial<Doctor>): Promise<Doctor> {
    return apiClient<Doctor>('/admin/doctors', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },
  async updateDoctor(doctorId: string, payload: Partial<Doctor>): Promise<Doctor> {
    return apiClient<Doctor>(`/admin/doctors/${doctorId}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  },
  async deleteDoctor(doctorId: string): Promise<void> {
    return apiClient<void>(`/admin/doctors/${doctorId}`, {
      method: 'DELETE',
    });
  },

  // Schedules
  async createSchedule(payload: Partial<Schedule>): Promise<Schedule> {
    return apiClient<Schedule>('/admin/schedules', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },
  async updateSchedule(scheduleId: string, payload: Partial<Schedule>): Promise<Schedule> {
    return apiClient<Schedule>(`/admin/schedules/${scheduleId}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  },
  async deleteSchedule(scheduleId: string): Promise<void> {
    return apiClient<void>(`/admin/schedules/${scheduleId}`, {
      method: 'DELETE',
    });
  },

  // Lab Tests
  async createLabTest(payload: Partial<LabTest>): Promise<LabTest> {
    return apiClient<LabTest>('/admin/labs', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },
  async updateLabTest(labId: string, payload: Partial<LabTest>): Promise<LabTest> {
    return apiClient<LabTest>(`/admin/labs/${labId}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  },
  async deleteLabTest(labId: string): Promise<void> {
    return apiClient<void>(`/admin/labs/${labId}`, {
      method: 'DELETE',
    });
  },
};
