import { z } from 'zod';

export const CreateHospitalSchema = z.object({
  name: z.string().min(1, 'name is required'),
  type: z.enum(['government', 'private']),
  city: z.string().min(1, 'city is required'),
  location: z.string().min(1, 'location is required'),
  address: z.string().min(1, 'address is required'),
  phone: z.string().min(1, 'phone is required'),
  email: z.string().email('valid email is required'),
  specialties: z.array(z.string()).min(1, 'at least one specialty is required'),
  imageUrl: z.string().optional(),
});

export const UpdateHospitalSchema = CreateHospitalSchema.partial();

export const CreateDepartmentSchema = z.object({
  hospitalId: z.string().min(1, 'hospitalId is required'),
  name: z.string().min(1, 'name is required'),
  description: z.string().min(1, 'description is required'),
  headOfDepartment: z.string().optional(),
  facilities: z.array(z.string()).default([]),
});

export const UpdateDepartmentSchema = CreateDepartmentSchema.partial();

export const CreateDoctorSchema = z.object({
  hospitalId: z.string().min(1, 'hospitalId is required'),
  departmentId: z.string().min(1, 'departmentId is required'),
  name: z.string().min(1, 'name is required'),
  specialty: z.string().min(1, 'specialty is required'),
  qualifications: z.string().min(1, 'qualifications is required'),
  experienceYears: z.number().nonnegative(),
  consultationFee: z.number().nonnegative(),
  availableDays: z.array(z.string()).min(1),
  timings: z.string().min(1),
});

export const UpdateDoctorSchema = CreateDoctorSchema.partial();

export const CreateScheduleSchema = z.object({
  hospitalId: z.string().min(1, 'hospitalId is required'),
  doctorId: z.string().min(1, 'doctorId is required'),
  dayOfWeek: z.string().min(1),
  startTime: z.string().regex(/^\d{2}:\d{2}$/),
  endTime: z.string().regex(/^\d{2}:\d{2}$/),
  slotDurationMinutes: z.number().positive(),
  maxPatients: z.number().positive(),
});

export const UpdateScheduleSchema = CreateScheduleSchema.partial();

export const CreateLabTestSchema = z.object({
  hospitalId: z.string().min(1, 'hospitalId is required'),
  testName: z.string().min(1, 'testName is required'),
  category: z.string().min(1, 'category is required'),
  price: z.number().nonnegative(),
  turnaroundHours: z.number().positive(),
  instructions: z.string().optional(),
});

export const UpdateLabTestSchema = CreateLabTestSchema.partial();
