import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { RecordService } from '../src/services/record.service.js';
import { InMemoryRecordRepository } from '../src/repositories/in-memory/in-memory-record.repository.js';
import { InMemoryCalendarRepository } from '../src/repositories/in-memory/in-memory-calendar.repository.js';
import { MockS3Service } from '../src/aws/s3.client.js';
import { MockTextractService } from '../src/aws/textract.client.js';
import { MockBedrockService } from '../src/aws/bedrock.client.js';
import { AuthContext } from '../src/types/auth.js';
import { ForbiddenError } from '../src/utils/errors.js';

describe('Prescriptions & Medical Reports Workflow', () => {
  let recordService: RecordService;
  let recordRepo: InMemoryRecordRepository;
  let calendarRepo: InMemoryCalendarRepository;

  const patientA: AuthContext = {
    userId: 'patient-A-001',
    email: 'patientA@example.com',
    roles: ['patient'],
  };

  const patientB: AuthContext = {
    userId: 'patient-B-002',
    email: 'patientB@example.com',
    roles: ['patient'],
  };

  beforeEach(() => {
    recordRepo = new InMemoryRecordRepository();
    calendarRepo = new InMemoryCalendarRepository();
    recordService = new RecordService(
      recordRepo,
      calendarRepo,
      new MockS3Service(),
      new MockTextractService(),
      new MockBedrockService()
    );
  });

  describe('Prescription Flow (Textract -> Bedrock -> Confirm -> Ongoing Medications)', () => {
    test('complete workflow: upload-url -> process -> confirm -> sync ongoing medicines', async () => {
      // 1. Generate Presigned S3 Upload URL
      const uploadRes = await recordService.generatePrescriptionUploadUrl(patientA, {
        fileName: 'prescription_sep.pdf',
        mimeType: 'application/pdf',
        fileSize: 1024 * 500,
      });

      assert.ok(uploadRes.uploadUrl);
      assert.equal(uploadRes.expiresInSeconds, 300);
      assert.ok(uploadRes.s3Key.startsWith(`patients/${patientA.userId}/prescriptions/`));

      // 2. Start Textract -> Bedrock extraction
      const processed = await recordService.processPrescription(patientA, uploadRes.recordId);
      assert.equal(processed.status, 'draft'); // unconfirmed
      assert.ok(processed.medicines.length > 0);
      assert.equal(processed.medicines[0]?.name, 'Telmisartan');

      // 3. Confirm Prescription
      const confirmed = await recordService.confirmPrescription(patientA, uploadRes.recordId, {
        diagnosis: 'Hypertension',
        prescriptionDate: '2026-09-15',
        medicines: [
          {
            name: 'Telmisartan',
            dosage: '40mg',
            frequency: '1 tablet daily',
            duration: '30 days',
            instructions: 'Morning after food',
          },
        ],
      });

      assert.equal(confirmed.status, 'confirmed');
      assert.ok(confirmed.confirmedAt);

      // 4. Verify medicines were synced to OngoingMedications
      const activeMeds = await calendarRepo.listMedicationsByPatient(patientA.userId);
      assert.equal(activeMeds.length, 1);
      assert.equal(activeMeds[0]?.name, 'Telmisartan');
      assert.equal(activeMeds[0]?.isActive, true);

      // 5. Patient Ownership: Patient B cannot view Patient A's prescription
      await assert.rejects(
        async () => recordService.getPrescription(patientB, uploadRes.recordId),
        (err: unknown) =>
          err instanceof ForbiddenError && err.code === 'ERR_OWNERSHIP_VIOLATION'
      );
    });
  });

  describe('Medical Report Flow (Upload -> Process -> Confirm)', () => {
    test('upload-url -> process draft -> confirm findings', async () => {
      // 1. Upload URL
      const uploadRes = await recordService.generateReportUploadUrl(patientA, {
        fileName: 'lipid_profile.png',
        mimeType: 'image/png',
        fileSize: 1024 * 800,
      });

      assert.ok(uploadRes.s3Key.startsWith(`patients/${patientA.userId}/reports/`));

      // 2. Process
      const processed = await recordService.processReport(patientA, uploadRes.recordId);
      assert.equal(processed.status, 'draft');
      assert.ok(processed.findings.length > 0);

      // 3. Confirm
      const confirmed = await recordService.confirmReport(patientA, uploadRes.recordId, {
        title: 'Comprehensive Metabolic & Lipid Profile',
        reportDate: '2026-08-28',
        findings: [
          {
            parameter: 'Total Cholesterol',
            value: '215',
            unit: 'mg/dL',
            status: 'high',
          },
        ],
      });

      assert.equal(confirmed.status, 'confirmed');
      assert.ok(confirmed.confirmedAt);

      // 4. Ownership check: Patient B cannot view Patient A's report
      await assert.rejects(
        async () => recordService.getReport(patientB, uploadRes.recordId),
        (err: unknown) =>
          err instanceof ForbiddenError && err.code === 'ERR_OWNERSHIP_VIOLATION'
      );
    });
  });
});
