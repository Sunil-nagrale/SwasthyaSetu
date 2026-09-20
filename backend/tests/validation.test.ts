import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  CreateAppointmentSchema,
  UpdateAppointmentStatusSchema,
} from '../src/validators/appointment.validator.js';
import {
  GenerateUploadUrlSchema,
  ConfirmPrescriptionSchema,
  ConfirmReportSchema,
} from '../src/validators/record.validator.js';
import { HospitalSearchQuerySchema } from '../src/validators/hospital.validator.js';
import { SymptomSubmissionSchema } from '../src/validators/ai.validator.js';

describe('Zod Validation Schemas (Strict Contract Adherence)', () => {
  describe('CreateAppointmentSchema', () => {
    test('accepts valid payload matching contract Section 4', () => {
      const valid = {
        hospitalId: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
        doctorId: 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22',
        preferredDate: '2026-10-15',
        preferredTime: '10:00',
        patientVisitNote: 'Follow-up for blood pressure check',
      };
      const result = CreateAppointmentSchema.safeParse(valid);
      assert.ok(result.success);
    });

    test('rejects non-UUID hospitalId and doctorId', () => {
      const invalid = {
        hospitalId: 'not-a-uuid',
        doctorId: 'also-invalid',
        preferredDate: '2026-10-15',
        preferredTime: '10:00',
      };
      const result = CreateAppointmentSchema.safeParse(invalid);
      assert.equal(result.success, false);
      if (!result.success) {
        assert.ok(result.error.issues.some((i) => i.path.includes('hospitalId')));
        assert.ok(result.error.issues.some((i) => i.path.includes('doctorId')));
      }
    });

    test('rejects invalid date and time formats', () => {
      const invalid = {
        hospitalId: '11111111-1111-1111-1111-111111111111',
        doctorId: 'd1111111-1111-1111-1111-111111111111',
        preferredDate: '15-10-2026', // invalid format
        preferredTime: '10:00:00', // invalid format
      };
      const result = CreateAppointmentSchema.safeParse(invalid);
      assert.equal(result.success, false);
    });
  });

  describe('UpdateAppointmentStatusSchema', () => {
    test('accepts accepted and rejected status values', () => {
      assert.ok(UpdateAppointmentStatusSchema.safeParse({ status: 'accepted' }).success);
      assert.ok(
        UpdateAppointmentStatusSchema.safeParse({
          status: 'rejected',
          rejectionReason: 'Doctor on emergency leave',
        }).success
      );
    });

    test('rejects illegal status values', () => {
      assert.equal(UpdateAppointmentStatusSchema.safeParse({ status: 'confirmed' }).success, false);
      assert.equal(UpdateAppointmentStatusSchema.safeParse({ status: 'pending' }).success, false);
      assert.equal(UpdateAppointmentStatusSchema.safeParse({ status: 'unknown' }).success, false);
    });
  });

  describe('GenerateUploadUrlSchema (S3 Security)', () => {
    test('accepts allowed MIME types (PDF, JPG, PNG) within 10MB', () => {
      assert.ok(
        GenerateUploadUrlSchema.safeParse({
          fileName: 'prescription.pdf',
          mimeType: 'application/pdf',
          fileSize: 1024 * 1024,
        }).success
      );
      assert.ok(
        GenerateUploadUrlSchema.safeParse({
          fileName: 'report.png',
          mimeType: 'image/png',
          fileSize: 2 * 1024 * 1024,
        }).success
      );
    });

    test('rejects disallowed MIME types or files larger than 10MB', () => {
      // Disallowed MIME type (e.g. text/html, application/zip)
      assert.equal(
        GenerateUploadUrlSchema.safeParse({
          fileName: 'bad.exe',
          mimeType: 'application/octet-stream',
          fileSize: 1024,
        }).success,
        false
      );

      // File > 10MB
      assert.equal(
        GenerateUploadUrlSchema.safeParse({
          fileName: 'large.pdf',
          mimeType: 'application/pdf',
          fileSize: 11 * 1024 * 1024,
        }).success,
        false
      );
    });
  });

  describe('HospitalSearchQuerySchema', () => {
    test('parses and defaults pagination values', () => {
      const parsed = HospitalSearchQuerySchema.parse({});
      assert.equal(parsed.page, 1);
      assert.equal(parsed.pageSize, 20);
    });

    test('enforces max pageSize of 100', () => {
      assert.equal(
        HospitalSearchQuerySchema.safeParse({ page: '1', pageSize: '150' }).success,
        false
      );
    });
  });

  describe('SymptomSubmissionSchema', () => {
    test('requires at least 3 characters', () => {
      assert.ok(SymptomSubmissionSchema.safeParse({ symptoms: 'Persistent cough and fever' }).success);
      assert.equal(SymptomSubmissionSchema.safeParse({ symptoms: 'hi' }).success, false);
    });
  });
});
