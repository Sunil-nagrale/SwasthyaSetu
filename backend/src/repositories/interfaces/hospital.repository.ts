import {
  Hospital,
  Department,
  Doctor,
  Schedule,
  BreakLeave,
  LabTest,
} from '../../types/hospital.js';
import { PaginatedResult } from '../../types/api.js';

export interface HospitalFilterParams {
  city?: string;
  type?: 'government' | 'private';
  specialty?: string;
  query?: string;
}

export interface IHospitalRepository {
  findHospitals(
    filters: HospitalFilterParams,
    page: number,
    pageSize: number
  ): Promise<PaginatedResult<Hospital>>;

  getHospitalById(hospitalId: string): Promise<Hospital | null>;
  createHospital(hospital: Hospital): Promise<Hospital>;
  updateHospital(hospitalId: string, updates: Partial<Hospital>): Promise<Hospital | null>;
  deleteHospital(hospitalId: string): Promise<boolean>;

  getDepartments(hospitalId: string): Promise<Department[]>;
  getDepartmentById(hospitalId: string, departmentId: string): Promise<Department | null>;
  createDepartment(department: Department): Promise<Department>;
  updateDepartment(
    departmentId: string,
    updates: Partial<Department>
  ): Promise<Department | null>;
  deleteDepartment(departmentId: string): Promise<boolean>;

  getDoctors(hospitalId: string, departmentId?: string): Promise<Doctor[]>;
  getDoctorById(hospitalId: string, doctorId: string): Promise<Doctor | null>;
  createDoctor(doctor: Doctor): Promise<Doctor>;
  updateDoctor(doctorId: string, updates: Partial<Doctor>): Promise<Doctor | null>;
  deleteDoctor(doctorId: string): Promise<boolean>;

  getSchedules(hospitalId: string, doctorId?: string): Promise<Schedule[]>;
  createSchedule(schedule: Schedule): Promise<Schedule>;
  updateSchedule(scheduleId: string, updates: Partial<Schedule>): Promise<Schedule | null>;
  deleteSchedule(scheduleId: string): Promise<boolean>;

  getBreakLeaves(hospitalId: string, doctorId?: string, date?: string): Promise<BreakLeave[]>;
  createBreakLeave(breakLeave: BreakLeave): Promise<BreakLeave>;

  getLabTests(hospitalId: string): Promise<LabTest[]>;
  getLabTestById(hospitalId: string, labId: string): Promise<LabTest | null>;
  createLabTest(labTest: LabTest): Promise<LabTest>;
  updateLabTest(labId: string, updates: Partial<LabTest>): Promise<LabTest | null>;
  deleteLabTest(labId: string): Promise<boolean>;
}
