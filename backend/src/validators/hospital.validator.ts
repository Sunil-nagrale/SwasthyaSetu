import { z } from 'zod';
import { PaginationQuerySchema } from './common.validator.js';

export const HospitalSearchQuerySchema = PaginationQuerySchema.extend({
  city: z.string().optional(),
  type: z.enum(['government', 'private']).optional(),
  specialty: z.string().optional(),
  query: z.string().optional(),
});

export const HospitalIdParamSchema = z.object({
  hospitalId: z.string().min(1, 'hospitalId is required'),
});

export const DepartmentIdParamSchema = z.object({
  hospitalId: z.string().min(1, 'hospitalId is required'),
  departmentId: z.string().min(1, 'departmentId is required'),
});

export const DoctorIdParamSchema = z.object({
  hospitalId: z.string().min(1, 'hospitalId is required'),
  doctorId: z.string().min(1, 'doctorId is required'),
});

export const DoctorAvailabilityQuerySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD').optional(),
});
