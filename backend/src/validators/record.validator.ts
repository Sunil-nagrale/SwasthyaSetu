import { z } from 'zod';

export const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/jpg',
] as const;

export const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB

export const GenerateUploadUrlSchema = z.object({
  fileName: z.string().min(1, 'fileName is required').max(255),
  mimeType: z.enum(ALLOWED_MIME_TYPES, {
    message: 'Allowed file types are PDF, JPG, JPEG, and PNG only',
  }),
  fileSize: z
    .number()
    .positive('fileSize must be positive')
    .max(MAX_FILE_SIZE_BYTES, 'File size exceeds maximum permitted limit of 10MB'),
});

export type GenerateUploadUrlInput = z.infer<typeof GenerateUploadUrlSchema>;

export const ExtractedMedicineSchema = z.object({
  medicineId: z.string().optional(),
  name: z.string().min(1, 'Medicine name is required'),
  dosage: z.string().min(1, 'Dosage is required'),
  frequency: z.string().min(1, 'Frequency is required'),
  duration: z.string().optional(),
  instructions: z.string().optional(),
});

export const UpdatePrescriptionStatusSchema = z.object({
  treatmentStatus: z.enum(['ongoing', 'completed', 'cured'], {
    message: "treatmentStatus must be 'ongoing', 'completed', or 'cured'",
  }),
});

export type UpdatePrescriptionStatusInput = z.infer<typeof UpdatePrescriptionStatusSchema>;

export const ConfirmPrescriptionSchema = z.object({
  diagnosis: z.string().optional(),
  doctorName: z.string().optional(),
  hospitalName: z.string().optional(),
  notes: z.string().optional(),
  treatmentStatus: z.enum(['ongoing', 'completed', 'cured']).optional(),
  prescriptionDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD')
    .optional(),
  medicines: z.array(ExtractedMedicineSchema).min(1, 'At least one medicine is required'),
});

export type ConfirmPrescriptionInput = z.infer<typeof ConfirmPrescriptionSchema>;

export const ExtractedFindingSchema = z.object({
  parameter: z.string().min(1, 'Parameter name is required'),
  value: z.string().min(1, 'Value is required'),
  unit: z.string().optional(),
  referenceRange: z.string().optional(),
  status: z.enum(['normal', 'high', 'low', 'abnormal']),
  notes: z.string().optional(),
});

export const ConfirmReportSchema = z.object({
  title: z.string().min(1, 'Report title is required'),
  testType: z.string().optional(),
  labName: z.string().optional(),
  doctorName: z.string().optional(),
  hospitalName: z.string().optional(),
  notes: z.string().optional(),
  reportDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD')
    .optional(),
  findings: z.array(ExtractedFindingSchema).min(1, 'At least one finding is required'),
  summary: z.string().optional(),
});

export type ConfirmReportInput = z.infer<typeof ConfirmReportSchema>;

export const PrescriptionIdParamSchema = z.object({
  prescriptionId: z.string().min(1, 'prescriptionId is required'),
});

export const ReportIdParamSchema = z.object({
  reportId: z.string().min(1, 'reportId is required'),
});
