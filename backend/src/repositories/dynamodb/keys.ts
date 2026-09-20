export const ENTITY = {
  HOSPITAL: 'HOSPITAL',
  DEPT: 'DEPT',
  DOCTOR: 'DOCTOR',
  SCHEDULE: 'SCHEDULE',
  BREAK: 'BREAK',
  LAB: 'LAB',
  USER: 'USER',
  PROFILE: 'PROFILE',
  MAPPING: 'HOSPITAL_ADMIN_MAPPING',
  APPOINTMENT: 'appointment',
  PRESCRIPTION: 'prescription',
  REPORT: 'report',
  CALENDAR: 'calendar',
  MED: 'medication',
  SESSION: 'diagnosis_session',
} as const;

export function patientPk(userId: string): string {
  return `patient#${userId}`;
}

export function hospitalPk(hospitalId: string): string {
  return `hospital#${hospitalId}`;
}

export function appointmentSk(appointmentId: string): string {
  return `appointment#${appointmentId}`;
}

export function hospitalMetaPk(hospitalId: string): string {
  return `HOSPITAL#${hospitalId}`;
}

export function userPk(userId: string): string {
  return `USER#${userId}`;
}
