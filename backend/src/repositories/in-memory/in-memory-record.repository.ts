import { Prescription, MedicalReport } from '../../types/record.js';
import { IRecordRepository } from '../interfaces/record.repository.js';
import { SEED_PRESCRIPTIONS, SEED_REPORTS } from './seed-data.js';

export class InMemoryRecordRepository implements IRecordRepository {
  private prescriptions: Map<string, Prescription> = new Map();
  private reports: Map<string, MedicalReport> = new Map();

  constructor() {
    for (const p of SEED_PRESCRIPTIONS) this.prescriptions.set(p.prescriptionId, { ...p });
    for (const r of SEED_REPORTS) this.reports.set(r.reportId, { ...r });
  }

  async savePrescription(prescription: Prescription): Promise<Prescription> {
    this.prescriptions.set(prescription.prescriptionId, { ...prescription });
    return { ...prescription };
  }

  async getPrescriptionById(prescriptionId: string): Promise<Prescription | null> {
    const p = this.prescriptions.get(prescriptionId);
    return p ? { ...p } : null;
  }

  async listPrescriptionsByPatient(patientId: string): Promise<Prescription[]> {
    return Array.from(this.prescriptions.values())
      .filter((p) => p.patientId === patientId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .map((p) => ({ ...p }));
  }

  async saveReport(report: MedicalReport): Promise<MedicalReport> {
    this.reports.set(report.reportId, { ...report });
    return { ...report };
  }

  async getReportById(reportId: string): Promise<MedicalReport | null> {
    const r = this.reports.get(reportId);
    return r ? { ...r } : null;
  }

  async listReportsByPatient(patientId: string): Promise<MedicalReport[]> {
    return Array.from(this.reports.values())
      .filter((r) => r.patientId === patientId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .map((r) => ({ ...r }));
  }
}

export const inMemoryRecordRepo = new InMemoryRecordRepository();
