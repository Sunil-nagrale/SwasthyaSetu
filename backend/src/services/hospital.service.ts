import { IHospitalRepository, HospitalFilterParams } from '../repositories/interfaces/hospital.repository.js';
import { IAppointmentRepository } from '../repositories/interfaces/appointment.repository.js';
import { Hospital, Department, Doctor, LabTest } from '../types/hospital.js';
import { PaginatedResult } from '../types/api.js';
import { NotFoundError } from '../utils/errors.js';
import {
  hospitalRepo as defaultHospitalRepo,
  appointmentRepo as defaultAppointmentRepo,
} from '../repositories/container.js';

export interface DoctorAvailabilitySlot {
  date: string;
  dayOfWeek: string;
  availableSlots: string[]; // ["09:00", "09:20", "09:40", ...]
}

export class HospitalService {
  constructor(
    private hospitalRepo: IHospitalRepository = defaultHospitalRepo,
    private appointmentRepo: IAppointmentRepository = defaultAppointmentRepo
  ) {}

  async searchHospitals(
    filters: HospitalFilterParams,
    page = 1,
    pageSize = 20
  ): Promise<PaginatedResult<Hospital>> {
    return this.hospitalRepo.findHospitals(filters, page, pageSize);
  }

  async getHospitalDetails(
    hospitalId: string
  ): Promise<Hospital & { departments?: Department[]; doctors?: Doctor[]; labTests?: LabTest[] }> {
    const hospital = await this.hospitalRepo.getHospitalById(hospitalId);
    if (!hospital) {
      throw new NotFoundError(`Hospital with id '${hospitalId}' not found`, 'ERR_NOT_FOUND');
    }
    const [departments, doctors, labTests] = await Promise.all([
      this.hospitalRepo.getDepartments(hospital.hospitalId),
      this.hospitalRepo.getDoctors(hospital.hospitalId),
      this.hospitalRepo.getLabTests(hospital.hospitalId),
    ]);
    return {
      ...hospital,
      departments,
      doctors,
      labTests,
    };
  }

  async getDepartments(hospitalId: string): Promise<Department[]> {
    await this.hospitalRepo.getHospitalById(hospitalId); // verify existence
    return this.hospitalRepo.getDepartments(hospitalId);
  }

  async getDepartmentDetails(
    hospitalId: string,
    departmentId: string
  ): Promise<{ department: Department; doctors: Doctor[] }> {
    await this.getHospitalDetails(hospitalId);
    const department = await this.hospitalRepo.getDepartmentById(hospitalId, departmentId);
    if (!department) {
      throw new NotFoundError(
        `Department '${departmentId}' not found in hospital '${hospitalId}'`,
        'ERR_NOT_FOUND'
      );
    }

    const doctors = await this.hospitalRepo.getDoctors(hospitalId, departmentId);
    return { department, doctors };
  }

  async getDoctors(hospitalId: string, departmentId?: string): Promise<Doctor[]> {
    await this.getHospitalDetails(hospitalId);
    return this.hospitalRepo.getDoctors(hospitalId, departmentId);
  }

  async getDoctorDetails(hospitalId: string, doctorId: string): Promise<Doctor> {
    await this.getHospitalDetails(hospitalId);
    const doctor = await this.hospitalRepo.getDoctorById(hospitalId, doctorId);
    if (!doctor) {
      throw new NotFoundError(`Doctor with id '${doctorId}' not found`, 'ERR_NOT_FOUND');
    }
    return doctor;
  }

  async getLabTests(hospitalId: string): Promise<LabTest[]> {
    await this.getHospitalDetails(hospitalId);
    return this.hospitalRepo.getLabTests(hospitalId);
  }

  // Contract Section 15: Server-side Availability Computation
  async computeDoctorAvailability(
    hospitalId: string,
    doctorId: string,
    dateStr: string // YYYY-MM-DD
  ): Promise<DoctorAvailabilitySlot> {
    const doctor = await this.getDoctorDetails(hospitalId, doctorId);
    const targetDate = new Date(dateStr);
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const dayOfWeek = dayNames[targetDate.getUTCDay()] || '';

    // Check if doctor works on this day of week
    if (!doctor.availableDays.includes(dayOfWeek)) {
      return { date: dateStr, dayOfWeek, availableSlots: [] };
    }

    // Check if doctor has taken leave on this date
    const breakLeaves = await this.hospitalRepo.getBreakLeaves(hospitalId, doctorId, dateStr);
    const onLeave = breakLeaves.some((b) => b.type === 'leave');
    if (onLeave) {
      return { date: dateStr, dayOfWeek, availableSlots: [] };
    }

    // Retrieve schedules for doctor
    const schedules = await this.hospitalRepo.getSchedules(hospitalId, doctorId);
    const schedule = schedules.find((s) => s.dayOfWeek === dayOfWeek);
    if (!schedule) {
      return { date: dateStr, dayOfWeek, availableSlots: [] };
    }

    // Compute time slots based on startTime, endTime, and slotDurationMinutes
    const [startH, startM] = schedule.startTime.split(':').map(Number);
    const [endH, endM] = schedule.endTime.split(':').map(Number);

    const startMinutes = (startH || 9) * 60 + (startM || 0);
    const endMinutes = (endH || 14) * 60 + (endM || 0);
    const duration = schedule.slotDurationMinutes || 20;

    const slots: string[] = [];
    for (let m = startMinutes; m + duration <= endMinutes; m += duration) {
      const hh = String(Math.floor(m / 60)).padStart(2, '0');
      const mm = String(m % 60).padStart(2, '0');
      const slotTime = `${hh}:${mm}`;

      // Check if slot falls in a break period
      const inBreak = breakLeaves.some((b) => {
        if (b.type === 'break' && b.startTime && b.endTime) {
          return slotTime >= b.startTime && slotTime < b.endTime;
        }
        return false;
      });

      if (!inBreak) {
        slots.push(slotTime);
      }
    }

    const accepted = await this.appointmentRepo.listAcceptedByDoctorOnDate(
      hospitalId,
      doctorId,
      dateStr
    );
    const bookedTimes = new Set(accepted.map((a) => a.preferredTime));
    const availableSlots = slots.filter((slot) => !bookedTimes.has(slot));

    return {
      date: dateStr,
      dayOfWeek,
      availableSlots,
    };
  }
}

export const hospitalService = new HospitalService();
