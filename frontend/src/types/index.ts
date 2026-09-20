// Common API & Domain Types for SwasthyaSetu

export type UserRole = 'patient' | 'hospital_admin' | 'admin';

export interface AuthUser {
  userId: string;
  email: string;
  roles: UserRole[];
  hospitalId?: string;
}

export interface PatientProfile {
  userId: string;
  name: string;
  email: string;
  phone?: string;
  dateOfBirth?: string;
  gender?: 'Male' | 'Female' | 'Other';
  bloodGroup?: string;
  address?: string;
  emergencyContact?: {
    name: string;
    phone: string;
    relation: string;
  };
  createdAt?: string;
  updatedAt?: string;
}

export interface Hospital {
  hospitalId: string;
  name: string;
  type: 'government' | 'private';
  city: string;
  location: string;
  address: string;
  phone: string;
  email: string;
  specialties: string[];
  imageUrl?: string;
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

export interface DoctorAvailabilitySlot {
  date: string;
  dayOfWeek: string;
  availableSlots: string[];
}

export type AppointmentStatus = 'pending' | 'accepted' | 'rejected' | 'canceled';

export interface Appointment {
  appointmentId: string;
  patientId: string;
  hospitalId: string;
  doctorId: string;
  status: AppointmentStatus;
  preferredDate: string;
  preferredTime: string;
  patientVisitNote?: string;
  rejectionReason?: string;
  acceptedAt?: string;
  rejectedAt?: string;
  canceledAt?: string;
  hospitalSnapshot: {
    hospitalId: string;
    name: string;
  };
  doctorSnapshot: {
    doctorId: string;
    name: string;
    specialty?: string;
  };
  patientSnapshot: {
    patientId: string;
    name: string;
    phone?: string;
    email?: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface CreateAppointmentPayload {
  hospitalId: string;
  doctorId: string;
  preferredDate: string;
  preferredTime: string;
  patientVisitNote?: string;
}

export interface Medicine {
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
  status: 'draft' | 'confirmed';
  treatmentStatus?: PrescriptionTreatmentStatus;
  doctorName?: string;
  hospitalName?: string;
  prescriptionDate?: string;
  diagnosis?: string;
  notes?: string;
  medicines: Medicine[];
  rawExtractedText?: string;
  confirmedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Finding {
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
  title: string;
  status: 'draft' | 'confirmed';
  testType?: string;
  labName?: string;
  doctorName?: string;
  hospitalName?: string;
  reportDate?: string;
  findings: Finding[];
  summary?: string;
  notes?: string;
  rawExtractedText?: string;
  confirmedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface OngoingMedication {
  medicineId: string;
  patientId: string;
  prescriptionId: string;
  name: string;
  dosage: string;
  frequency: string;
  instructions?: string;
  startDate: string;
  endDate?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CalendarEvent {
  eventId: string;
  patientId: string;
  title: string;
  description?: string;
  date: string;
  time: string;
  type: 'appointment' | 'medication' | 'personal' | 'followup';
  appointmentId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SymptomEvaluation {
  isEmergency: boolean;
  urgentCareMessage?: string;
  disclaimer: string;
  sessionId?: string;
}

export interface FollowupQuestionResponse {
  sessionId: string;
  questions: string[];
  disclaimer: string;
}

export interface SuggestedHospitalDoctor {
  doctorId: string;
  name: string;
  specialty: string;
  timings?: string;
  consultationFee?: number;
}

export interface SuggestedHospital {
  hospitalId: string;
  name: string;
  city: string;
  departments?: { departmentId: string; name: string }[];
  doctors?: SuggestedHospitalDoctor[];
}

export interface SpecialistRecommendation {
  sessionId: string;
  recommendedSpecialty?: string;
  recommendedSpecialist?: string;
  symptomSummary?: string;
  urgency?: 'Routine' | 'Soon' | 'Urgent' | 'Immediate Emergency';
  urgencyLevel?: 'routine' | 'soon' | 'urgent';
  emergencyWarning?: string | null;
  suggestedSpecialty?: string;
  possibleCategories?: string[];
  reasoning?: string;
  reason?: string;
  missingInformation?: string[];
  recommendedNextStep?: string;
  suggestedQuestionsForDoctor?: string[];
  suggestedHospitals?: SuggestedHospital[];
  disclaimer: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  citations?: ChatCitation[];
  createdAt: string;
}

export interface ChatCitation {
  type?: string;
  id?: string;
  name?: string;
  context?: string;
  recordId?: string;
  recordType?: 'prescription' | 'report';
  recordName?: string;
  date?: string;
  matchedText?: string;
}

export interface PaginatedResult<T> {
  totalCount: number;
  page: number;
  pageSize: number;
  items: T[];
}

export interface ApiError {
  code: string;
  message: string;
  status?: number;
}
