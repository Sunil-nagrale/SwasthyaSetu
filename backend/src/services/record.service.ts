import { randomUUID } from 'node:crypto';
import { IRecordRepository } from '../repositories/interfaces/record.repository.js';
import { ICalendarRepository } from '../repositories/interfaces/calendar.repository.js';
import {
  recordRepo as defaultRecordRepo,
  calendarRepo as defaultCalendarRepo,
  s3Service as defaultS3Service,
  textractService as defaultTextractService,
  bedrockService as defaultBedrockService,
} from '../repositories/container.js';
import { IS3Service } from '../aws/s3.client.js';
import { ITextractService } from '../aws/textract.client.js';
import { IBedrockService } from '../aws/bedrock.client.js';
import { AuthContext } from '../types/auth.js';
import { Prescription, MedicalReport, UploadUrlResponse } from '../types/record.js';
import {
  GenerateUploadUrlInput,
  ConfirmPrescriptionInput,
  ConfirmReportInput,
} from '../validators/record.validator.js';
import { NotFoundError, ForbiddenError, BadRequestError } from '../utils/errors.js';
import { env } from '../config/env.js';

export class RecordService {
  constructor(
    private recordRepo: IRecordRepository = defaultRecordRepo,
    private calendarRepo: ICalendarRepository = defaultCalendarRepo,
    private s3: IS3Service = defaultS3Service,
    private textract: ITextractService = defaultTextractService,
    private bedrock: IBedrockService = defaultBedrockService
  ) {}

  // --- PRESCRIPTIONS ---

  async generatePrescriptionUploadUrl(
    auth: AuthContext,
    input: GenerateUploadUrlInput
  ): Promise<UploadUrlResponse> {
    const prescriptionId = randomUUID();
    const cleanFileName = input.fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
    // Contract Section 10 Key Pattern: patients/{userId}/prescriptions/{prescriptionId}/{fileName}
    const s3Key = `patients/${auth.userId}/prescriptions/${prescriptionId}/${cleanFileName}`;

    const uploadUrl = await this.s3.generatePresignedUploadUrl(
      env.S3_BUCKET_NAME,
      s3Key,
      input.mimeType,
      input.fileSize,
      300 // Max 5 minutes TTL
    );

    const now = new Date().toISOString();
    const prescription: Prescription = {
      prescriptionId,
      patientId: auth.userId,
      fileName: input.fileName,
      s3Key,
      mimeType: input.mimeType,
      fileSize: input.fileSize,
      status: 'draft',
      medicines: [],
      createdAt: now,
      updatedAt: now,
    };

    await this.recordRepo.savePrescription(prescription);

    return {
      uploadUrl,
      recordId: prescriptionId,
      s3Key,
      expiresInSeconds: 300,
    };
  }

  async processPrescription(auth: AuthContext, prescriptionId: string): Promise<Prescription> {
    const prescription = await this.recordRepo.getPrescriptionById(prescriptionId);
    if (!prescription) {
      throw new NotFoundError(`Prescription '${prescriptionId}' not found`, 'ERR_NOT_FOUND');
    }

    if (prescription.patientId !== auth.userId) {
      throw new ForbiddenError(
        "Forbidden: cannot process another patient's prescription",
        'ERR_OWNERSHIP_VIOLATION'
      );
    }

    // 1. Textract OCR
    const ocrResult = await this.textract.extractText(env.S3_BUCKET_NAME, prescription.s3Key);

    // 2. Bedrock Structured Extraction
    const extracted = await this.bedrock.extractPrescription(ocrResult.text);

    // 3. Update as draft unconfirmed
    const now = new Date().toISOString();
    prescription.status = 'draft';
    prescription.rawExtractedText = ocrResult.text;
    prescription.diagnosis = extracted.diagnosis;
    prescription.doctorName = extracted.doctorName;
    prescription.hospitalName = extracted.hospitalName;
    prescription.prescriptionDate = extracted.prescriptionDate;
    prescription.medicines = extracted.medicines;
    prescription.updatedAt = now;

    return this.recordRepo.savePrescription(prescription);
  }

  async confirmPrescription(
    auth: AuthContext,
    prescriptionId: string,
    input: ConfirmPrescriptionInput
  ): Promise<Prescription> {
    const prescription = await this.recordRepo.getPrescriptionById(prescriptionId);
    if (!prescription) {
      throw new NotFoundError(`Prescription '${prescriptionId}' not found`, 'ERR_NOT_FOUND');
    }

    if (prescription.patientId !== auth.userId) {
      throw new ForbiddenError(
        "Forbidden: cannot confirm another patient's prescription",
        'ERR_OWNERSHIP_VIOLATION'
      );
    }

    const now = new Date().toISOString();
    prescription.status = 'confirmed';
    prescription.treatmentStatus = input.treatmentStatus || 'ongoing';
    if (input.notes) prescription.notes = input.notes;
    prescription.confirmedAt = now;
    prescription.updatedAt = now;
    if (input.diagnosis) prescription.diagnosis = input.diagnosis;
    if (input.doctorName) prescription.doctorName = input.doctorName;
    if (input.hospitalName) prescription.hospitalName = input.hospitalName;
    if (input.prescriptionDate) prescription.prescriptionDate = input.prescriptionDate;
    prescription.medicines = input.medicines.map((m) => ({
      ...m,
      medicineId: m.medicineId || randomUUID(),
      isActive: prescription.treatmentStatus === 'ongoing',
    }));

    const saved = await this.recordRepo.savePrescription(prescription);

    await this.calendarRepo.deactivateMedicationsByPrescription(
      auth.userId,
      prescription.prescriptionId
    );

    if (prescription.treatmentStatus === 'ongoing') {
      for (const med of prescription.medicines) {
        await this.calendarRepo.saveOngoingMedication({
          medicineId: med.medicineId || randomUUID(),
          patientId: auth.userId,
          prescriptionId: prescription.prescriptionId,
          name: med.name,
          dosage: med.dosage,
          frequency: med.frequency,
          instructions: med.instructions,
          startDate: prescription.prescriptionDate || now.split('T')[0] || '',
          isActive: true,
          createdAt: now,
          updatedAt: now,
        });
      }
    }

    return saved;
  }

  async updatePrescriptionStatus(
    auth: AuthContext,
    prescriptionId: string,
    treatmentStatus: 'ongoing' | 'completed' | 'cured'
  ): Promise<Prescription> {
    const prescription = await this.recordRepo.getPrescriptionById(prescriptionId);
    if (!prescription) {
      throw new NotFoundError(`Prescription '${prescriptionId}' not found`, 'ERR_NOT_FOUND');
    }

    if (prescription.patientId !== auth.userId) {
      throw new ForbiddenError(
        "Forbidden: cannot modify another patient's prescription",
        'ERR_OWNERSHIP_VIOLATION'
      );
    }

    const now = new Date().toISOString();
    prescription.treatmentStatus = treatmentStatus;
    prescription.updatedAt = now;

    if (treatmentStatus === 'completed' || treatmentStatus === 'cured') {
      await this.calendarRepo.deactivateMedicationsByPrescription(
        auth.userId,
        prescription.prescriptionId
      );
    } else if (treatmentStatus === 'ongoing') {
      for (const med of prescription.medicines) {
        await this.calendarRepo.saveOngoingMedication({
          medicineId: med.medicineId || randomUUID(),
          patientId: auth.userId,
          prescriptionId: prescription.prescriptionId,
          name: med.name,
          dosage: med.dosage,
          frequency: med.frequency,
          instructions: med.instructions,
          startDate: prescription.prescriptionDate || now.split('T')[0] || '',
          isActive: true,
          createdAt: now,
          updatedAt: now,
        });
      }
    }

    return this.recordRepo.savePrescription(prescription);
  }

  async listPrescriptions(auth: AuthContext): Promise<Prescription[]> {
    return this.recordRepo.listPrescriptionsByPatient(auth.userId);
  }

  async getPrescription(auth: AuthContext, prescriptionId: string): Promise<Prescription> {
    const prescription = await this.recordRepo.getPrescriptionById(prescriptionId);
    if (!prescription) {
      throw new NotFoundError(`Prescription '${prescriptionId}' not found`, 'ERR_NOT_FOUND');
    }

    if (prescription.patientId !== auth.userId) {
      throw new ForbiddenError(
        "Forbidden: cannot view another patient's prescription",
        'ERR_OWNERSHIP_VIOLATION'
      );
    }

    return prescription;
  }

  // --- MEDICAL REPORTS ---

  async generateReportUploadUrl(
    auth: AuthContext,
    input: GenerateUploadUrlInput
  ): Promise<UploadUrlResponse> {
    const reportId = randomUUID();
    const cleanFileName = input.fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
    // Contract Section 10 Key Pattern: patients/{userId}/reports/{reportId}/{fileName}
    const s3Key = `patients/${auth.userId}/reports/${reportId}/${cleanFileName}`;

    const uploadUrl = await this.s3.generatePresignedUploadUrl(
      env.S3_BUCKET_NAME,
      s3Key,
      input.mimeType,
      input.fileSize,
      300
    );

    const now = new Date().toISOString();
    const report: MedicalReport = {
      reportId,
      patientId: auth.userId,
      fileName: input.fileName,
      s3Key,
      mimeType: input.mimeType,
      fileSize: input.fileSize,
      title: input.fileName,
      status: 'draft',
      findings: [],
      createdAt: now,
      updatedAt: now,
    };

    await this.recordRepo.saveReport(report);

    return {
      uploadUrl,
      recordId: reportId,
      s3Key,
      expiresInSeconds: 300,
    };
  }

  async processReport(auth: AuthContext, reportId: string): Promise<MedicalReport> {
    const report = await this.recordRepo.getReportById(reportId);
    if (!report) {
      throw new NotFoundError(`Medical report '${reportId}' not found`, 'ERR_NOT_FOUND');
    }

    if (report.patientId !== auth.userId) {
      throw new ForbiddenError(
        "Forbidden: cannot process another patient's report",
        'ERR_OWNERSHIP_VIOLATION'
      );
    }

    // 1. Textract OCR
    const ocrResult = await this.textract.extractText(env.S3_BUCKET_NAME, report.s3Key);

    // 2. Bedrock Structured Extraction
    const extracted = await this.bedrock.extractReport(ocrResult.text);

    // 3. Save as draft
    const now = new Date().toISOString();
    report.status = 'draft';
    report.rawExtractedText = ocrResult.text;
    report.title = extracted.title;
    report.testType = extracted.testType;
    report.labName = extracted.labName;
    report.reportDate = extracted.reportDate;
    report.findings = extracted.findings;
    report.summary = extracted.summary;
    report.updatedAt = now;

    return this.recordRepo.saveReport(report);
  }

  async confirmReport(
    auth: AuthContext,
    reportId: string,
    input: ConfirmReportInput
  ): Promise<MedicalReport> {
    const report = await this.recordRepo.getReportById(reportId);
    if (!report) {
      throw new NotFoundError(`Medical report '${reportId}' not found`, 'ERR_NOT_FOUND');
    }

    if (report.patientId !== auth.userId) {
      throw new ForbiddenError(
        "Forbidden: cannot confirm another patient's report",
        'ERR_OWNERSHIP_VIOLATION'
      );
    }

    const now = new Date().toISOString();
    report.status = 'confirmed';
    report.confirmedAt = now;
    report.updatedAt = now;
    report.title = input.title;
    if (input.testType) report.testType = input.testType;
    if (input.labName) report.labName = input.labName;
    if (input.doctorName) report.doctorName = input.doctorName;
    if (input.hospitalName) report.hospitalName = input.hospitalName;
    if (input.notes) report.notes = input.notes;
    if (input.reportDate) report.reportDate = input.reportDate;
    report.findings = input.findings;
    if (input.summary) report.summary = input.summary;

    return this.recordRepo.saveReport(report);
  }

  async listReports(auth: AuthContext): Promise<MedicalReport[]> {
    return this.recordRepo.listReportsByPatient(auth.userId);
  }

  async getReport(auth: AuthContext, reportId: string): Promise<MedicalReport> {
    const report = await this.recordRepo.getReportById(reportId);
    if (!report) {
      throw new NotFoundError(`Medical report '${reportId}' not found`, 'ERR_NOT_FOUND');
    }

    if (report.patientId !== auth.userId) {
      throw new ForbiddenError(
        "Forbidden: cannot view another patient's report",
        'ERR_OWNERSHIP_VIOLATION'
      );
    }

    return report;
  }
}

export const recordService = new RecordService();
