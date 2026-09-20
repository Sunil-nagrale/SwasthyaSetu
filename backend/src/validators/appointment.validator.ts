import { z } from 'zod';

const UUID_REGEX = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

export const CreateAppointmentSchema = z.object({
  hospitalId: z.string().regex(UUID_REGEX, { message: 'hospitalId must be a valid UUID' }),
  doctorId: z.string().regex(UUID_REGEX, { message: 'doctorId must be a valid UUID' }),
  preferredDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'preferredDate must be in YYYY-MM-DD format',
  }),
  preferredTime: z.string().regex(/^\d{2}:\d{2}$/, {
    message: 'preferredTime must be in HH:MM format',
  }),
  patientVisitNote: z.string().optional(),
});

export type CreateAppointmentInput = z.infer<typeof CreateAppointmentSchema>;

export const UpdateAppointmentStatusSchema = z.object({
  status: z.enum(['accepted', 'rejected'], {
    message: "status must be either 'accepted' or 'rejected'",
  }),
  rejectionReason: z.string().optional(),
});

export type UpdateAppointmentStatusInput = z.infer<typeof UpdateAppointmentStatusSchema>;

export const AppointmentIdParamSchema = z.object({
  appointmentId: z.string().min(1, 'appointmentId is required'),
});
