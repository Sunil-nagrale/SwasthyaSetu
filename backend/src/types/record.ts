export type RecordStatus = 'draft' | 'confirmed';

export interface ExtractedMedicine {
  medicineId?: string;
  name: string;
  dosage: string;
  frequency: string;
  duration?: string;
  instructions?: string;
  isActive?: boolean;
}

export type PrescriptionTreatmentStatus = 'ongoing' | 'completed' | 'cured';

export interface Prescription {
  prescriptionId: string;
  patientId: string;
  fileName: string;
  s3Key: string;
  mimeType: string;
  fileSize: number;
  status: RecordStatus;
  treatmentStatus?: PrescriptionTreatmentStatus;
  doctorName?: string;
  hospitalName?: string;
  prescriptionDate?: string;
  notes?: string;
  diagnosis?: string;
  medicines: ExtractedMedicine[];
  rawExtractedText?: string;
  createdAt: string;
  updatedAt: string;
  confirmedAt?: string;
}

export interface ExtractedFinding {
  parameter: string;
  value: string;
  unit?: string;
  referenceRange?: string;
  status: 'normal' | 'high' | 'low' | 'abnormal';
  notes?: string;
}

export interface MedicalReport {
  reportId: string;
  patientId: string;
  fileName: string;
  s3Key: string;
  mimeType: string;
  fileSize: number;
  status: RecordStatus;
  title: string;
  testType?: string;
  labName?: string;
  doctorName?: string;
  hospitalName?: string;
  notes?: string;
  reportDate?: string;
  findings: ExtractedFinding[];
  summary?: string;
  rawExtractedText?: string;
  createdAt: string;
  updatedAt: string;
  confirmedAt?: string;
}

export interface UploadUrlResponse {
  uploadUrl: string;
  recordId: string;
  s3Key: string;
  expiresInSeconds: number;
}
