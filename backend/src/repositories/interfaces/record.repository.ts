import { Prescription, MedicalReport } from '../../types/record.js';

export interface IRecordRepository {
  savePrescription(prescription: Prescription): Promise<Prescription>;
  getPrescriptionById(prescriptionId: string): Promise<Prescription | null>;
  listPrescriptionsByPatient(patientId: string): Promise<Prescription[]>;

  saveReport(report: MedicalReport): Promise<MedicalReport>;
  getReportById(reportId: string): Promise<MedicalReport | null>;
  listReportsByPatient(patientId: string): Promise<MedicalReport[]>;
}
