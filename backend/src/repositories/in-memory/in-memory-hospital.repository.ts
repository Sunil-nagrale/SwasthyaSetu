import {
  Hospital,
  Department,
  Doctor,
  Schedule,
  BreakLeave,
  LabTest,
} from '../../types/hospital.js';
import { PaginatedResult } from '../../types/api.js';
import {
  IHospitalRepository,
  HospitalFilterParams,
} from '../interfaces/hospital.repository.js';
import {
  SEED_HOSPITALS,
  SEED_DEPARTMENTS,
  SEED_DOCTORS,
  SEED_SCHEDULES,
  SEED_BREAK_LEAVES,
  SEED_LAB_TESTS,
  SHARDA_HOSPITAL_ID,
} from './seed-data.js';

function resolveHospitalId(id: string): string {
  if (id === 'hosp-sharda-001') return SHARDA_HOSPITAL_ID;
  return id;
}

export class InMemoryHospitalRepository implements IHospitalRepository {
  private hospitals: Map<string, Hospital> = new Map();
  private departments: Map<string, Department> = new Map();
  private doctors: Map<string, Doctor> = new Map();
  private schedules: Map<string, Schedule> = new Map();
  private breakLeaves: Map<string, BreakLeave> = new Map();
  private labTests: Map<string, LabTest> = new Map();

  constructor() {
    for (const h of SEED_HOSPITALS) this.hospitals.set(h.hospitalId, { ...h });
    for (const d of SEED_DEPARTMENTS) this.departments.set(d.departmentId, { ...d });
    for (const doc of SEED_DOCTORS) this.doctors.set(doc.doctorId, { ...doc });
    for (const s of SEED_SCHEDULES) this.schedules.set(s.scheduleId, { ...s });
    for (const bl of SEED_BREAK_LEAVES) this.breakLeaves.set(bl.breakLeaveId, { ...bl });
    for (const l of SEED_LAB_TESTS) this.labTests.set(l.labId, { ...l });
  }

  async findHospitals(
    filters: HospitalFilterParams,
    page = 1,
    pageSize = 20
  ): Promise<PaginatedResult<Hospital>> {
    let result = Array.from(this.hospitals.values());

    if (filters.city) {
      const cityLower = filters.city.toLowerCase();
      result = result.filter((h) => h.city.toLowerCase().includes(cityLower));
    }

    if (filters.type) {
      result = result.filter((h) => h.type === filters.type);
    }

    if (filters.specialty) {
      const specLower = filters.specialty.toLowerCase();
      result = result.filter((h) =>
        h.specialties.some((s) => s.toLowerCase().includes(specLower))
      );
    }

    if (filters.query) {
      const qLower = filters.query.toLowerCase();
      result = result.filter(
        (h) =>
          h.name.toLowerCase().includes(qLower) ||
          h.location.toLowerCase().includes(qLower) ||
          h.address.toLowerCase().includes(qLower)
      );
    }

    const totalCount = result.length;
    const startIndex = (page - 1) * pageSize;
    const paginatedItems = result.slice(startIndex, startIndex + pageSize);

    return {
      totalCount,
      page,
      pageSize,
      items: paginatedItems.map((h) => ({ ...h })),
    };
  }

  async getHospitalById(hospitalId: string): Promise<Hospital | null> {
    const h = this.hospitals.get(resolveHospitalId(hospitalId));
    return h ? { ...h } : null;
  }

  async createHospital(hospital: Hospital): Promise<Hospital> {
    this.hospitals.set(hospital.hospitalId, { ...hospital });
    return { ...hospital };
  }

  async updateHospital(
    hospitalId: string,
    updates: Partial<Hospital>
  ): Promise<Hospital | null> {
    const resolvedId = resolveHospitalId(hospitalId);
    const existing = this.hospitals.get(resolvedId);
    if (!existing) return null;
    const updated = { ...existing, ...updates, updatedAt: new Date().toISOString() };
    this.hospitals.set(resolvedId, updated);
    return { ...updated };
  }

  async deleteHospital(hospitalId: string): Promise<boolean> {
    return this.hospitals.delete(resolveHospitalId(hospitalId));
  }

  async getDepartments(hospitalId: string): Promise<Department[]> {
    const resolvedId = resolveHospitalId(hospitalId);
    return Array.from(this.departments.values())
      .filter((d) => d.hospitalId === resolvedId)
      .map((d) => ({ ...d }));
  }

  async getDepartmentById(hospitalId: string, departmentId: string): Promise<Department | null> {
    const resolvedId = resolveHospitalId(hospitalId);
    const d = this.departments.get(departmentId);
    if (!d || d.hospitalId !== resolvedId) return null;
    return { ...d };
  }

  async createDepartment(department: Department): Promise<Department> {
    this.departments.set(department.departmentId, { ...department });
    return { ...department };
  }

  async updateDepartment(
    departmentId: string,
    updates: Partial<Department>
  ): Promise<Department | null> {
    const existing = this.departments.get(departmentId);
    if (!existing) return null;
    const updated = { ...existing, ...updates, updatedAt: new Date().toISOString() };
    this.departments.set(departmentId, updated);
    return { ...updated };
  }

  async deleteDepartment(departmentId: string): Promise<boolean> {
    return this.departments.delete(departmentId);
  }

  async getDoctors(hospitalId: string, departmentId?: string): Promise<Doctor[]> {
    const resolvedId = resolveHospitalId(hospitalId);
    return Array.from(this.doctors.values())
      .filter(
        (doc) =>
          doc.hospitalId === resolvedId && (!departmentId || doc.departmentId === departmentId)
      )
      .map((doc) => ({ ...doc }));
  }

  async getDoctorById(hospitalId: string, doctorId: string): Promise<Doctor | null> {
    const resolvedId = resolveHospitalId(hospitalId);
    const doc = this.doctors.get(doctorId);
    if (!doc || doc.hospitalId !== resolvedId) return null;
    return { ...doc };
  }

  async createDoctor(doctor: Doctor): Promise<Doctor> {
    this.doctors.set(doctor.doctorId, { ...doctor });
    return { ...doctor };
  }

  async updateDoctor(doctorId: string, updates: Partial<Doctor>): Promise<Doctor | null> {
    const existing = this.doctors.get(doctorId);
    if (!existing) return null;
    const updated = { ...existing, ...updates, updatedAt: new Date().toISOString() };
    this.doctors.set(doctorId, updated);
    return { ...updated };
  }

  async deleteDoctor(doctorId: string): Promise<boolean> {
    return this.doctors.delete(doctorId);
  }

  async getSchedules(hospitalId: string, doctorId?: string): Promise<Schedule[]> {
    const resolvedId = resolveHospitalId(hospitalId);
    return Array.from(this.schedules.values())
      .filter((s) => s.hospitalId === resolvedId && (!doctorId || s.doctorId === doctorId))
      .map((s) => ({ ...s }));
  }

  async createSchedule(schedule: Schedule): Promise<Schedule> {
    this.schedules.set(schedule.scheduleId, { ...schedule });
    return { ...schedule };
  }

  async updateSchedule(
    scheduleId: string,
    updates: Partial<Schedule>
  ): Promise<Schedule | null> {
    const existing = this.schedules.get(scheduleId);
    if (!existing) return null;
    const updated = { ...existing, ...updates, updatedAt: new Date().toISOString() };
    this.schedules.set(scheduleId, updated);
    return { ...updated };
  }

  async deleteSchedule(scheduleId: string): Promise<boolean> {
    return this.schedules.delete(scheduleId);
  }

  async getBreakLeaves(
    hospitalId: string,
    doctorId?: string,
    date?: string
  ): Promise<BreakLeave[]> {
    const resolvedId = resolveHospitalId(hospitalId);
    return Array.from(this.breakLeaves.values())
      .filter(
        (b) =>
          b.hospitalId === resolvedId &&
          (!doctorId || b.doctorId === doctorId) &&
          (!date || b.date === date)
      )
      .map((b) => ({ ...b }));
  }

  async createBreakLeave(breakLeave: BreakLeave): Promise<BreakLeave> {
    this.breakLeaves.set(breakLeave.breakLeaveId, { ...breakLeave });
    return { ...breakLeave };
  }

  async getLabTests(hospitalId: string): Promise<LabTest[]> {
    const resolvedId = resolveHospitalId(hospitalId);
    return Array.from(this.labTests.values())
      .filter((l) => l.hospitalId === resolvedId)
      .map((l) => ({ ...l }));
  }

  async getLabTestById(hospitalId: string, labId: string): Promise<LabTest | null> {
    const resolvedId = resolveHospitalId(hospitalId);
    const lab = this.labTests.get(labId);
    if (!lab || lab.hospitalId !== resolvedId) return null;
    return { ...lab };
  }

  async createLabTest(labTest: LabTest): Promise<LabTest> {
    this.labTests.set(labTest.labId, { ...labTest });
    return { ...labTest };
  }

  async updateLabTest(labId: string, updates: Partial<LabTest>): Promise<LabTest | null> {
    const existing = this.labTests.get(labId);
    if (!existing) return null;
    const updated = { ...existing, ...updates, updatedAt: new Date().toISOString() };
    this.labTests.set(labId, updated);
    return { ...updated };
  }

  async deleteLabTest(labId: string): Promise<boolean> {
    return this.labTests.delete(labId);
  }
}

export const inMemoryHospitalRepo = new InMemoryHospitalRepository();
