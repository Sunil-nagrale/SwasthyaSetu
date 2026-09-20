export type HospitalType = 'government' | 'private';

export interface Hospital {
  hospitalId: string;
  name: string;
  type: HospitalType;
  city: string;
  location: string;
  address: string;
  phone: string;
  email: string;
  imageUrl?: string;
  specialties: string[];
  createdAt: string;
  updatedAt: string;
}

export interface Department {
  departmentId: string;
  hospitalId: string;
  name: string;
  description: string;
  headOfDepartment?: string;
  facilities: string[];
  createdAt: string;
  updatedAt: string;
}

export interface Doctor {
  doctorId: string;
  hospitalId: string;
  departmentId: string;
  name: string;
  specialty: string;
  qualifications: string;
  experienceYears: number;
  consultationFee: number;
  availableDays: string[];
  timings: string;
  createdAt: string;
  updatedAt: string;
}

export interface Schedule {
  scheduleId: string;
  hospitalId: string;
  doctorId: string;
  dayOfWeek: string;
  startTime: string; // HH:MM
  endTime: string;   // HH:MM
  slotDurationMinutes: number;
  maxPatients: number;
  createdAt: string;
  updatedAt: string;
}

export interface BreakLeave {
  breakLeaveId: string;
  hospitalId: string;
  doctorId: string;
  type: 'break' | 'leave';
  date: string; // YYYY-MM-DD
  startTime?: string; // HH:MM
  endTime?: string;   // HH:MM
  reason?: string;
  createdAt: string;
  updatedAt: string;
}

export interface LabTest {
  labId: string;
  hospitalId: string;
  testName: string;
  category: string;
  price: number;
  turnaroundHours: number;
  instructions?: string;
  createdAt: string;
  updatedAt: string;
}
