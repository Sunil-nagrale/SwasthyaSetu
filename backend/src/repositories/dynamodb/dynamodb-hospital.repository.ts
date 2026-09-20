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
import { hospitalMetaPk } from './keys.js';
import { deleteItem, getItem, putItem, queryByPk, queryGsi, stripKeys } from './document.js';
import { paginateItems } from '../../utils/pagination.js';
import { env } from '../../config/env.js';

function hospitalItem(hospital: Hospital) {
  return {
    PK: hospitalMetaPk(hospital.hospitalId),
    SK: 'METADATA',
    GSI1PK: `CITY#${hospital.city.toLowerCase()}`,
    GSI1SK: `HOSPITAL#${hospital.hospitalId}`,
    GSI2PK: `TYPE#${hospital.type}`,
    GSI2SK: `HOSPITAL#${hospital.hospitalId}`,
    entityType: 'hospital',
    ...hospital,
  };
}

export class DynamoHospitalRepository implements IHospitalRepository {
  async findHospitals(
    filters: HospitalFilterParams,
    page: number,
    pageSize: number
  ): Promise<PaginatedResult<Hospital>> {
    let items: Hospital[] = [];
    if (filters.city) {
      items = (
        await queryGsi('GSI1', 'GSI1PK', `CITY#${filters.city.toLowerCase()}`)
      ).map((i) => stripKeys<Hospital>(i));
    } else if (filters.type) {
      items = (await queryGsi('GSI2', 'GSI2PK', `TYPE#${filters.type}`)).map((i) =>
        stripKeys<Hospital>(i)
      );
    } else {
      const { ScanCommand } = await import('@aws-sdk/lib-dynamodb');
      const { getDocumentClient } = await import('./document.js');
      const client = await getDocumentClient();
      const res = (await client.send(
        new ScanCommand({
          TableName: env.DYNAMODB_TABLE_NAME,
          FilterExpression: 'SK = :sk AND entityType = :et',
          ExpressionAttributeValues: { ':sk': 'METADATA', ':et': 'hospital' },
        })
      )) as { Items?: Array<Record<string, unknown>> };
      items = (res.Items ?? []).map((i) => stripKeys<Hospital>(i as never));
    }

    if (filters.type) items = items.filter((h) => h.type === filters.type);
    if (filters.city) {
      const cityLower = filters.city.toLowerCase();
      items = items.filter((h) => h.city.toLowerCase().includes(cityLower));
    }
    if (filters.specialty) {
      const specLower = filters.specialty.toLowerCase();
      items = items.filter((h) =>
        h.specialties.some((s) => s.toLowerCase().includes(specLower))
      );
    }
    if (filters.query) {
      const qLower = filters.query.toLowerCase();
      items = items.filter(
        (h) =>
          h.name.toLowerCase().includes(qLower) ||
          h.location.toLowerCase().includes(qLower) ||
          h.address.toLowerCase().includes(qLower)
      );
    }

    return paginateItems(items, page, pageSize);
  }

  async getHospitalById(hospitalId: string): Promise<Hospital | null> {
    const item = await getItem(hospitalMetaPk(hospitalId), 'METADATA');
    return item ? stripKeys<Hospital>(item) : null;
  }

  async createHospital(hospital: Hospital): Promise<Hospital> {
    await putItem(hospitalItem(hospital));
    return hospital;
  }

  async updateHospital(hospitalId: string, updates: Partial<Hospital>): Promise<Hospital | null> {
    const existing = await this.getHospitalById(hospitalId);
    if (!existing) return null;
    const updated = { ...existing, ...updates, updatedAt: new Date().toISOString() };
    await putItem(hospitalItem(updated));
    return updated;
  }

  async deleteHospital(hospitalId: string): Promise<boolean> {
    const existing = await this.getHospitalById(hospitalId);
    if (!existing) return false;
    await deleteItem(hospitalMetaPk(hospitalId), 'METADATA');
    return true;
  }

  async getDepartments(hospitalId: string): Promise<Department[]> {
    return (await queryByPk(hospitalMetaPk(hospitalId), 'DEPT#')).map((i) =>
      stripKeys<Department>(i)
    );
  }

  async getDepartmentById(hospitalId: string, departmentId: string): Promise<Department | null> {
    const item = await getItem(hospitalMetaPk(hospitalId), `DEPT#${departmentId}`);
    return item ? stripKeys<Department>(item) : null;
  }

  async createDepartment(department: Department): Promise<Department> {
    await putItem({
      PK: hospitalMetaPk(department.hospitalId),
      SK: `DEPT#${department.departmentId}`,
      entityType: 'department',
      ...department,
    });
    return department;
  }

  async updateDepartment(
    departmentId: string,
    updates: Partial<Department>
  ): Promise<Department | null> {
    const hospitalId = updates.hospitalId;
    if (!hospitalId) return null;
    const existing = await this.getDepartmentById(hospitalId, departmentId);
    if (!existing) return null;
    const updated = { ...existing, ...updates, updatedAt: new Date().toISOString() };
    return this.createDepartment(updated);
  }

  async deleteDepartment(departmentId: string): Promise<boolean> {
    return false;
  }

  async getDoctors(hospitalId: string, departmentId?: string): Promise<Doctor[]> {
    const doctors = (await queryByPk(hospitalMetaPk(hospitalId), 'DOCTOR#')).map((i) =>
      stripKeys<Doctor>(i)
    );
    return departmentId ? doctors.filter((d) => d.departmentId === departmentId) : doctors;
  }

  async getDoctorById(hospitalId: string, doctorId: string): Promise<Doctor | null> {
    const item = await getItem(hospitalMetaPk(hospitalId), `DOCTOR#${doctorId}`);
    return item ? stripKeys<Doctor>(item) : null;
  }

  async createDoctor(doctor: Doctor): Promise<Doctor> {
    await putItem({
      PK: hospitalMetaPk(doctor.hospitalId),
      SK: `DOCTOR#${doctor.doctorId}`,
      GSI1PK: `SPECIALTY#${doctor.specialty.toLowerCase()}`,
      GSI1SK: `DOCTOR#${doctor.doctorId}`,
      entityType: 'doctor',
      ...doctor,
    });
    return doctor;
  }

  async updateDoctor(doctorId: string, updates: Partial<Doctor>): Promise<Doctor | null> {
    if (!updates.hospitalId) return null;
    const existing = await this.getDoctorById(updates.hospitalId, doctorId);
    if (!existing) return null;
    const updated = { ...existing, ...updates, updatedAt: new Date().toISOString() };
    return this.createDoctor(updated);
  }

  async deleteDoctor(doctorId: string): Promise<boolean> {
    return false;
  }

  async getSchedules(hospitalId: string, doctorId?: string): Promise<Schedule[]> {
    const schedules = (await queryByPk(hospitalMetaPk(hospitalId), 'SCHEDULE#')).map((i) =>
      stripKeys<Schedule>(i)
    );
    return doctorId ? schedules.filter((s) => s.doctorId === doctorId) : schedules;
  }

  async createSchedule(schedule: Schedule): Promise<Schedule> {
    await putItem({
      PK: hospitalMetaPk(schedule.hospitalId),
      SK: `SCHEDULE#${schedule.doctorId}#${schedule.scheduleId}`,
      entityType: 'schedule',
      ...schedule,
    });
    return schedule;
  }

  async updateSchedule(scheduleId: string, updates: Partial<Schedule>): Promise<Schedule | null> {
    if (!updates.hospitalId || !updates.doctorId) return null;
    const schedules = await this.getSchedules(updates.hospitalId, updates.doctorId);
    const existing = schedules.find((s) => s.scheduleId === scheduleId);
    if (!existing) return null;
    const updated = { ...existing, ...updates, updatedAt: new Date().toISOString() };
    return this.createSchedule(updated);
  }

  async deleteSchedule(scheduleId: string): Promise<boolean> {
    return false;
  }

  async getBreakLeaves(
    hospitalId: string,
    doctorId?: string,
    date?: string
  ): Promise<BreakLeave[]> {
    return (await queryByPk(hospitalMetaPk(hospitalId), 'BREAK#'))
      .map((i) => stripKeys<BreakLeave>(i))
      .filter(
        (b) =>
          (!doctorId || b.doctorId === doctorId) && (!date || b.date === date)
      );
  }

  async createBreakLeave(breakLeave: BreakLeave): Promise<BreakLeave> {
    await putItem({
      PK: hospitalMetaPk(breakLeave.hospitalId),
      SK: `BREAK#${breakLeave.doctorId}#${breakLeave.breakLeaveId}`,
      entityType: 'break_leave',
      ...breakLeave,
    });
    return breakLeave;
  }

  async getLabTests(hospitalId: string): Promise<LabTest[]> {
    return (await queryByPk(hospitalMetaPk(hospitalId), 'LAB#')).map((i) =>
      stripKeys<LabTest>(i)
    );
  }

  async getLabTestById(hospitalId: string, labId: string): Promise<LabTest | null> {
    const item = await getItem(hospitalMetaPk(hospitalId), `LAB#${labId}`);
    return item ? stripKeys<LabTest>(item) : null;
  }

  async createLabTest(labTest: LabTest): Promise<LabTest> {
    await putItem({
      PK: hospitalMetaPk(labTest.hospitalId),
      SK: `LAB#${labTest.labId}`,
      entityType: 'lab',
      ...labTest,
    });
    return labTest;
  }

  async updateLabTest(labId: string, updates: Partial<LabTest>): Promise<LabTest | null> {
    if (!updates.hospitalId) return null;
    const existing = await this.getLabTestById(updates.hospitalId, labId);
    if (!existing) return null;
    const updated = { ...existing, ...updates, updatedAt: new Date().toISOString() };
    return this.createLabTest(updated);
  }

  async deleteLabTest(labId: string): Promise<boolean> {
    return false;
  }
}

export const dynamoHospitalRepo = new DynamoHospitalRepository();
