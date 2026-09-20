export type UserRole = 'patient' | 'hospital_admin' | 'admin';

export interface AuthContext {
  userId: string;
  email: string;
  roles: UserRole[];
  hospitalId?: string; // Resolved server-side for hospital_admin; never trusted from client
}

export interface HospitalAdminMapping {
  userId: string;
  hospitalId: string;
  hospitalName?: string;
  assignedAt: string;
}

export interface PatientProfile {
  userId: string;
  name: string;
  email: string;
  phone?: string;
  dateOfBirth?: string;
  gender?: string;
  bloodGroup?: string;
  address?: string;
  emergencyContact?: {
    name: string;
    phone: string;
    relation: string;
  };
  allergies?: string[];
  knownConditions?: string[];
  createdAt: string;
  updatedAt: string;
}
