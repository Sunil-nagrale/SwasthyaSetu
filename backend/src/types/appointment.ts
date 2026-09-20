export type AppointmentStatus = 'pending' | 'accepted' | 'rejected' | 'canceled';

export interface HospitalSnapshot {
  hospitalId: string;
  name: string;
}

export interface DoctorSnapshot {
  doctorId: string;
  name: string;
  specialty?: string;
}

export interface PatientSnapshot {
  patientId: string;
  name: string;
  phone?: string;
  email?: string;
}

export interface Appointment {
  appointmentId: string;
  patientId: string;
  hospitalId: string;
  doctorId: string;
  status: AppointmentStatus;
  preferredDate: string; // YYYY-MM-DD
  preferredTime: string; // HH:MM
  patientVisitNote?: string;
  hospitalSnapshot: HospitalSnapshot;
  doctorSnapshot: DoctorSnapshot;
  patientSnapshot: PatientSnapshot;
  createdAt: string;
  updatedAt: string;
  acceptedAt?: string;
  rejectedAt?: string;
  canceledAt?: string;
  rejectionReason?: string;
}
