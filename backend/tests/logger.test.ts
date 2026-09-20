import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { sanitize } from '../src/utils/logger.js';

describe('Structured Logger & Medical PII Redaction', () => {
  test('redacts passwords, authorization tokens, and credentials', () => {
    const payload = {
      email: 'user@example.com',
      password: 'MySecretPassword123',
      authorization: 'Bearer eyJhbGciOi...',
      token: 'secret-token-xyz',
    };

    const sanitized = sanitize(payload) as Record<string, unknown>;
    assert.equal(sanitized.email, 'user@example.com');
    assert.equal(sanitized.password, '[REDACTED]');
    assert.equal(sanitized.authorization, '[REDACTED]');
    assert.equal(sanitized.token, '[REDACTED]');
  });

  test('redacts sensitive healthcare information (patient notes, symptoms, diagnosis, findings)', () => {
    const medicalPayload = {
      patientId: 'patient-123',
      hospitalId: 'hosp-456',
      patientVisitNote: 'Severe chest tightness and palpitations',
      symptoms: 'Fever and breathlessness',
      diagnosis: 'Type 2 Diabetes',
      medicines: [{ name: 'Metformin', dosage: '500mg' }],
      findings: [{ parameter: 'HbA1c', value: '8.2' }],
    };

    const sanitized = sanitize(medicalPayload) as Record<string, unknown>;
    assert.equal(sanitized.patientId, 'patient-123');
    assert.equal(sanitized.hospitalId, 'hosp-456');
    assert.equal(sanitized.patientVisitNote, '[REDACTED]');
    assert.equal(sanitized.symptoms, '[REDACTED]');
    assert.equal(sanitized.diagnosis, '[REDACTED]');
    assert.equal(sanitized.medicines, '[REDACTED]');
    assert.equal(sanitized.findings, '[REDACTED]');
  });

  test('handles nested objects and arrays safely', () => {
    const nested = {
      user: {
        id: 'u-1',
        credentials: {
          password: 'secret',
        },
      },
      records: [
        {
          id: 'rec-1',
          diagnosis: 'Sensitive diagnosis',
        },
      ],
    };

    const sanitized = sanitize(nested) as any;
    assert.equal(sanitized.user.credentials.password, '[REDACTED]');
    assert.equal(sanitized.records[0].diagnosis, '[REDACTED]');
  });
});
