import { randomUUID } from 'node:crypto';
import { IHospitalRepository } from '../repositories/interfaces/hospital.repository.js';
import { hospitalRepo as defaultHospitalRepo } from '../repositories/container.js';
import {
  Hospital,
  Department,
  Doctor,
  Schedule,
  LabTest,
} from '../types/hospital.js';
import { NotFoundError } from '../utils/errors.js';

export class AdminService {
  constructor(private hospitalRepo: IHospitalRepository = defaultHospitalRepo) {}

  // Hospital CRUD
  async createHospital(data: Omit<Hospital, 'hospitalId' | 'createdAt' | 'updatedAt'>): Promise<Hospital> {
    const now = new Date().toISOString();
    const hospital: Hospital = {
      ...data,
      hospitalId: randomUUID(),
      createdAt: now,
      updatedAt: now,
    };
    return this.hospitalRepo.createHospital(hospital);
  }

  async listHospitals(): Promise<Hospital[]> {
    const res = await this.hospitalRepo.findHospitals({}, 1, 100);
    return res.items;
  }

  async getHospital(hospitalId: string): Promise<Hospital> {
    const hospital = await this.hospitalRepo.getHospitalById(hospitalId);
    if (!hospital) {
      throw new NotFoundError(`Hospital '${hospitalId}' not found`, 'ERR_NOT_FOUND');
    }
    return hospital;
  }

  async updateHospital(hospitalId: string, updates: Partial<Hospital>): Promise<Hospital> {
    const updated = await this.hospitalRepo.updateHospital(hospitalId, updates);
    if (!updated) {
      throw new NotFoundError(`Hospital '${hospitalId}' not found`, 'ERR_NOT_FOUND');
    }
    return updated;
  }

  async deleteHospital(hospitalId: string): Promise<boolean> {
    return this.hospitalRepo.deleteHospital(hospitalId);
  }

  // Department CRUD
  async createDepartment(data: Omit<Department, 'departmentId' | 'createdAt' | 'updatedAt'>): Promise<Department> {
    const now = new Date().toISOString();
    const department: Department = {
      ...data,
      departmentId: randomUUID(),
      createdAt: now,
      updatedAt: now,
    };
    return this.hospitalRepo.createDepartment(department);
  }

  async listDepartments(hospitalId: string): Promise<Department[]> {
    return this.hospitalRepo.getDepartments(hospitalId);
  }

  async updateDepartment(departmentId: string, updates: Partial<Department>): Promise<Department> {
    const updated = await this.hospitalRepo.updateDepartment(departmentId, updates);
    if (!updated) {
      throw new NotFoundError(`Department '${departmentId}' not found`, 'ERR_NOT_FOUND');
    }
    return updated;
  }

  async deleteDepartment(departmentId: string): Promise<boolean> {
    return this.hospitalRepo.deleteDepartment(departmentId);
  }

  // Doctor CRUD
  async createDoctor(data: Omit<Doctor, 'doctorId' | 'createdAt' | 'updatedAt'>): Promise<Doctor> {
    const now = new Date().toISOString();
    const doctor: Doctor = {
      ...data,
      doctorId: randomUUID(),
      createdAt: now,
      updatedAt: now,
    };
    return this.hospitalRepo.createDoctor(doctor);
  }

  async listDoctors(hospitalId: string, departmentId?: string): Promise<Doctor[]> {
    return this.hospitalRepo.getDoctors(hospitalId, departmentId);
  }

  async updateDoctor(doctorId: string, updates: Partial<Doctor>): Promise<Doctor> {
    const updated = await this.hospitalRepo.updateDoctor(doctorId, updates);
    if (!updated) {
      throw new NotFoundError(`Doctor '${doctorId}' not found`, 'ERR_NOT_FOUND');
    }
    return updated;
  }

  async deleteDoctor(doctorId: string): Promise<boolean> {
    return this.hospitalRepo.deleteDoctor(doctorId);
  }

  // Schedule CRUD
  async createSchedule(data: Omit<Schedule, 'scheduleId' | 'createdAt' | 'updatedAt'>): Promise<Schedule> {
    const now = new Date().toISOString();
    const schedule: Schedule = {
      ...data,
      scheduleId: randomUUID(),
      createdAt: now,
      updatedAt: now,
    };
    return this.hospitalRepo.createSchedule(schedule);
  }

  async updateSchedule(scheduleId: string, updates: Partial<Schedule>): Promise<Schedule> {
    const updated = await this.hospitalRepo.updateSchedule(scheduleId, updates);
    if (!updated) {
      throw new NotFoundError(`Schedule '${scheduleId}' not found`, 'ERR_NOT_FOUND');
    }
    return updated;
  }

  async deleteSchedule(scheduleId: string): Promise<boolean> {
    return this.hospitalRepo.deleteSchedule(scheduleId);
  }

  // Lab CRUD
  async createLabTest(data: Omit<LabTest, 'labId' | 'createdAt' | 'updatedAt'>): Promise<LabTest> {
    const now = new Date().toISOString();
    const labTest: LabTest = {
      ...data,
      labId: randomUUID(),
      createdAt: now,
      updatedAt: now,
    };
    return this.hospitalRepo.createLabTest(labTest);
  }

  async updateLabTest(labId: string, updates: Partial<LabTest>): Promise<LabTest> {
    const updated = await this.hospitalRepo.updateLabTest(labId, updates);
    if (!updated) {
      throw new NotFoundError(`Lab test '${labId}' not found`, 'ERR_NOT_FOUND');
    }
    return updated;
  }

  async deleteLabTest(labId: string): Promise<boolean> {
    return this.hospitalRepo.deleteLabTest(labId);
  }
}

export const adminService = new AdminService();
