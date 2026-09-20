import { Prescription, MedicalReport } from '../../types/record.js';
import { IRecordRepository } from '../interfaces/record.repository.js';
import { patientPk } from './keys.js';
import { getItem, putItem, queryByPk, stripKeys } from './document.js';

export class DynamoRecordRepository implements IRecordRepository {
  async savePrescription(prescription: Prescription): Promise<Prescription> {
    await putItem({
      PK: patientPk(prescription.patientId),
      SK: `prescription#${prescription.prescriptionId}`,
      entityType: 'prescription',
      ...prescription,
    });
    await putItem({
      PK: `PRESCRIPTION#${prescription.prescriptionId}`,
      SK: 'LOOKUP',
      patientId: prescription.patientId,
      prescriptionId: prescription.prescriptionId,
      entityType: 'prescription_lookup',
    });
    return prescription;
  }

  async getPrescriptionById(prescriptionId: string): Promise<Prescription | null> {
    const lookup = await getItem(`PRESCRIPTION#${prescriptionId}`, 'LOOKUP');
    if (!lookup || typeof lookup.patientId !== 'string') return null;
    const item = await getItem(patientPk(lookup.patientId), `prescription#${prescriptionId}`);
    return item ? stripKeys<Prescription>(item) : null;
  }

  async listPrescriptionsByPatient(patientId: string): Promise<Prescription[]> {
    return (await queryByPk(patientPk(patientId), 'prescription#')).map((i) =>
      stripKeys<Prescription>(i)
    );
  }

  async saveReport(report: MedicalReport): Promise<MedicalReport> {
    await putItem({
      PK: patientPk(report.patientId),
      SK: `report#${report.reportId}`,
      entityType: 'report',
      ...report,
    });
    await putItem({
      PK: `REPORT#${report.reportId}`,
      SK: 'LOOKUP',
      patientId: report.patientId,
      reportId: report.reportId,
      entityType: 'report_lookup',
    });
    return report;
  }

  async getReportById(reportId: string): Promise<MedicalReport | null> {
    const lookup = await getItem(`REPORT#${reportId}`, 'LOOKUP');
    if (!lookup || typeof lookup.patientId !== 'string') return null;
    const item = await getItem(patientPk(lookup.patientId), `report#${reportId}`);
    return item ? stripKeys<MedicalReport>(item) : null;
  }

  async listReportsByPatient(patientId: string): Promise<MedicalReport[]> {
    return (await queryByPk(patientPk(patientId), 'report#')).map((i) =>
      stripKeys<MedicalReport>(i)
    );
  }
}

export const dynamoRecordRepo = new DynamoRecordRepository();
