import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { AiService } from '../src/services/ai.service.js';
import { InMemoryHospitalRepository } from '../src/repositories/in-memory/in-memory-hospital.repository.js';
import { InMemoryRecordRepository } from '../src/repositories/in-memory/in-memory-record.repository.js';
import { MockBedrockService, AI_DISCLAIMER } from '../src/aws/bedrock.client.js';
import { SHARDA_HOSPITAL_ID } from '../src/repositories/in-memory/seed-data.js';
import { InMemoryDiagnosisSessionRepository } from '../src/repositories/in-memory/in-memory-diagnosis-session.repository.js';
import { NotFoundError, BadRequestError } from '../src/utils/errors.js';

describe('AI Workflows, Safety & Grounding', () => {
  let aiService: AiService;
  let hospitalRepo: InMemoryHospitalRepository;
  let recordRepo: InMemoryRecordRepository;

  const patientAuth: AuthContext = {
    userId: 'patient-test-001',
    email: 'patient@example.com',
    roles: ['patient'],
  };

  beforeEach(async () => {
    hospitalRepo = new InMemoryHospitalRepository();
    recordRepo = new InMemoryRecordRepository();
    aiService = new AiService(
      hospitalRepo,
      recordRepo,
      new MockBedrockService(),
      new InMemoryDiagnosisSessionRepository()
    );

    // Seed confirmed prescription for patient-test-001
    await recordRepo.savePrescription({
      prescriptionId: 'presc-001',
      patientId: patientAuth.userId,
      fileName: 'presc.pdf',
      s3Key: `patients/${patientAuth.userId}/prescriptions/presc-001/presc.pdf`,
      mimeType: 'application/pdf',
      fileSize: 1024,
      status: 'confirmed',
      doctorName: 'Dr. Ramesh Sharma',
      hospitalName: 'Sharda Hospital',
      prescriptionDate: '2026-09-15',
      medicines: [
        {
          name: 'Telmisartan',
          dosage: '40mg',
          frequency: 'once daily morning',
          instructions: 'take with water',
          isActive: true,
        },
      ],
      createdAt: '2026-09-15T10:00:00.000Z',
      updatedAt: '2026-09-15T10:00:00.000Z',
    });

    // Seed confirmed report for patient-test-001
    await recordRepo.saveReport({
      reportId: 'rep-001',
      patientId: patientAuth.userId,
      fileName: 'blood_test.pdf',
      s3Key: `patients/${patientAuth.userId}/reports/rep-001/blood_test.pdf`,
      mimeType: 'application/pdf',
      fileSize: 2048,
      status: 'confirmed',
      title: 'Annual Blood Test',
      reportDate: '2026-08-28',
      findings: [
        {
          parameter: 'Total Cholesterol',
          value: '215',
          unit: 'mg/dL',
          referenceRange: '< 200 mg/dL',
          status: 'high',
        },
      ],
      createdAt: '2026-08-28T10:00:00.000Z',
      updatedAt: '2026-08-28T10:00:00.000Z',
    });
  });

  describe('Symptom Flow & Emergency Escalation (Contract Section 12)', () => {
    test('detects emergency red flags (chest pain) and halts recommendation', async () => {
      const evalResult = await aiService.submitSymptoms({
        symptoms: 'Sudden crushing chest pain radiating to left arm and shortness of breath',
      });

      assert.equal(evalResult.isEmergency, true);
      assert.ok(evalResult.urgentCareMessage);
      assert.ok(evalResult.urgentCareMessage.includes('EMERGENCY ALERT'));
      assert.equal(evalResult.disclaimer, AI_DISCLAIMER);
      assert.ok(evalResult.sessionId);

      await assert.rejects(
        async () => aiService.getFollowupQuestions(evalResult.sessionId!),
        (err: unknown) => err instanceof BadRequestError && err.code === 'ERR_EMERGENCY_HALT'
      );
      await assert.rejects(
        async () =>
          aiService.recommendSpecialist({
            sessionId: evalResult.sessionId!,
            answers: { duration: 'minutes' },
          }),
        (err: unknown) => err instanceof BadRequestError && err.code === 'ERR_EMERGENCY_HALT'
      );
    });

    test('allows non-emergency symptoms to proceed with sessionId and disclaimer', async () => {
      const evalResult = await aiService.submitSymptoms({
        symptoms: 'Mild knee stiffness and joint ache for the past two weeks',
      });

      assert.equal(evalResult.isEmergency, false);
      assert.ok(evalResult.sessionId);
      assert.equal(evalResult.disclaimer, AI_DISCLAIMER);

      // Follow-up questions
      const questions = await aiService.getFollowupQuestions(evalResult.sessionId!);
      assert.ok(questions.questions.length > 0);
      assert.equal(questions.disclaimer, AI_DISCLAIMER);

      // Specialist recommendation
      const rec = await aiService.recommendSpecialist({
        sessionId: evalResult.sessionId!,
        answers: { duration: '2 weeks' },
      });
      assert.equal(rec.sessionId, evalResult.sessionId);
    });

    test('rejects unknown diagnosis sessions and binds follow-up questions to stored symptoms', async () => {
      await assert.rejects(
        async () => aiService.getFollowupQuestions('missing-session'),
        (err: unknown) => err instanceof NotFoundError && err.code === 'ERR_NOT_FOUND'
      );

      const evalResult = await aiService.submitSymptoms({
        symptoms: 'Persistent headache and dizziness for several days',
      });
      const questions = await aiService.getFollowupQuestions(evalResult.sessionId!);
      assert.ok(questions.questions.some((q) => q.toLowerCase().includes('headache')));
    });
  });

  describe('Hospital Chatbot Grounding (Contract Section 13)', () => {
    test('answers from structured hospital data with citations', async () => {
      const res = await aiService.hospitalChat(patientAuth, {
        hospitalId: SHARDA_HOSPITAL_ID,
        query: 'Is there a cardiologist at Sharda Hospital?',
      });

      assert.ok(res.reply.includes('Dr. Ramesh Sharma'));
      assert.ok(res.citations.length > 0);
      assert.equal(res.citations[0]?.type, 'doctor');
    });

    test('returns strictly "Information not available." when data is not present', async () => {
      const res = await aiService.hospitalChat(patientAuth, {
        hospitalId: SHARDA_HOSPITAL_ID,
        query: 'What are your robotic brain surgery helicopter services?',
      });

      assert.equal(res.reply, 'Information not available.');
      assert.equal(res.citations.length, 0);
    });
  });

  describe('Personal Health Chatbot Grounding (Contract Section 14)', () => {
    test('answers from confirmed patient prescription with citation', async () => {
      const res = await aiService.patientChat(patientAuth, {
        query: 'What dosage of Telmisartan am I taking?',
      });

      assert.ok(res.reply.includes('Telmisartan'));
      assert.ok(res.reply.includes('40mg'));
      assert.ok(res.citations.length > 0);
      assert.ok(res.citations[0]?.recordName.includes('Telmisartan'));
    });

    test('answers from confirmed lab report with citation', async () => {
      const res = await aiService.patientChat(patientAuth, {
        query: 'What was my cholesterol level in my last test?',
      });

      assert.ok(res.reply.includes('Annual Blood Test'));
      assert.ok(res.reply.includes('215'));
      assert.ok(res.citations.length > 0);
    });

    test('safely rejects diagnosis and prescription requests as per guardrails', async () => {
      const res = await aiService.patientChat(patientAuth, {
        query: 'Can you prescribe me antibiotics for a cold?',
      });

      assert.ok(res.reply.includes('cannot provide a medical diagnosis or prescribe'));
    });

    test('returns strictly "I don\'t have that information." if not in records', async () => {
      const res = await aiService.patientChat(patientAuth, {
        query: 'What was my MRI brain scan result?',
      });

      assert.equal(res.reply, "I don't have that information.");
    });
  });
});
