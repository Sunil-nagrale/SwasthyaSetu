import { z } from 'zod';

export const CreateCalendarEventSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200),
  description: z.string().optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD'),
  time: z.string().regex(/^\d{2}:\d{2}$/, 'Time must be HH:MM').optional(),
  type: z.enum(['appointment', 'medication_reminder', 'lab_test', 'followup', 'custom']),
  appointmentId: z.string().optional(),
});

export type CreateCalendarEventInput = z.infer<typeof CreateCalendarEventSchema>;

export const UpdateCalendarEventSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  time: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  type: z.enum(['appointment', 'medication_reminder', 'lab_test', 'followup', 'custom']).optional(),
});

export type UpdateCalendarEventInput = z.infer<typeof UpdateCalendarEventSchema>;

export const EventIdParamSchema = z.object({
  eventId: z.string().min(1, 'eventId is required'),
});
