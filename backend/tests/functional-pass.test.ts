import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { RecordService } from '../src/services/record.service.js';
import { HospitalService } from '../src/services/hospital.service.js';
import { AiService } from '../src/services/ai.service.js';
import { InMemoryRecordRepository } from '../src/repositories/in-memory/in-memory-record.repository.js';
import { InMemoryCalendarRepository } from '../src/repositories/in-memory/in-memory-calendar.repository.js';
import { InMemoryHospitalRepository } from '../src/repositories/in-memory/in-memory-hospital.repository.js';
import { InMemoryUserRepository } from '../src/repositories/in-memory/in-memory-user.repository.js';
import { InMemoryAppointmentRepository } from '../src/repositories/in-memory/in-memory-appointment.repository.js';
import { InMemoryDiagnosisSessionRepository } from '../src/repositories/in-memory/in-memory-diagnosis-session.repository.js';
import { MockBedrockService } from '../src/aws/bedrock.client.js';
import { MockS3Service } from '../src/aws/s3.client.js';
import { MockTextractService } from '../src/aws/textract.client.js';
import { SHARDA_HOSPITAL_ID } from '../src/repositories/in-memory/seed-data.js';
import { AuthContext } from '../types/auth.js';
import { ForbiddenError } from '../src/utils/errors.js';

describe('Functional Pass: Features, Safety, Privacy & Grounding', () => {
  let recordService: RecordService;
  let hospitalService: HospitalService;
  let aiService: AiService;
  let recordRepo: InMemoryRecordRepository;
  let calendarRepo: InMemoryCalendarRepository;
  let hospitalRepo: InMemoryHospitalRepository;
  let userRepo: InMemoryUserRepository;
  let appointmentRepo: InMemoryAppointmentRepository;

  const patientA: AuthContext = {
    userId: 'patient-test-001',
    email: 'patient1@example.com',
    roles: ['patient'],
  };

  const patientB: AuthContext = {
    userId: 'patient-test-999',
    email: 'patient2@example.com',
    roles: ['patient'],
  };

  beforeEach(async () => {
    recordRepo = new InMemoryRecordRepository();
    calendarRepo = new InMemoryCalendarRepository();
    hospitalRepo = new InMemoryHospitalRepository();
    userRepo = new InMemoryUserRepository();
    appointmentRepo = new InMemoryAppointmentRepository();

    recordService = new RecordService(
      recordRepo,
      calendarRepo,
      new MockS3Service(),
      new MockTextractService(),
      new MockBedrockService()
    );

    hospitalService = new HospitalService(hospitalRepo);

    aiService = new AiService(
      hospitalRepo,
      recordRepo,
      new MockBedrockService(),
      new InMemoryDiagnosisSessionRepository(),
      userRepo,
      appointmentRepo,
      calendarRepo
    );
  });

  describe('Part A: Prescription Treatment Status & Calendar Sync', () => {
    test('updates prescription status and deactivates calendar medication when completed/cured', async () => {
      // 1. Confirm a prescription for patientA
      const rx = await recordRepo.savePrescription({
        prescriptionId: 'rx-status-001',
        patientId: patientA.userId,
        fileName: 'rx.pdf',
        s3Key: `patients/${patientA.userId}/prescriptions/rx-status-001/rx.pdf`,
        mimeType: 'application/pdf',
        fileSize: 1024,
        status: 'draft',
        doctorName: 'Dr. Ramesh Sharma',
        hospitalName: 'Sharda Hospital',
        prescriptionDate: '2026-09-18',
        medicines: [
          {
            name: 'Amoxicillin',
            dosage: '500mg',
            frequency: 'three times a day',
            duration: '7 days',
            instructions: 'after food',
            isActive: true,
          },
        ],
        createdAt: '2026-09-18T10:00:00.000Z',
        updatedAt: '2026-09-18T10:00:00.000Z',
      });

      // Confirm as ongoing
      await recordService.confirmPrescription(patientA, rx.prescriptionId, {
        doctorName: 'Dr. Ramesh Sharma',
        hospitalName: 'Sharda Hospital',
        prescriptionDate: '2026-09-18',
        treatmentStatus: 'ongoing',
        medicines: rx.medicines,
      });

      // Verify medication is active in calendar
      const meds1 = await calendarRepo.listMedicationsByPatient(patientA.userId);
      const activeMeds = meds1.filter((m) => m.prescriptionId === rx.prescriptionId && m.isActive);
      assert.equal(activeMeds.length, 1);

      // Now update status to 'completed'
      const updated = await recordService.updatePrescriptionStatus(patientA, rx.prescriptionId, 'completed');
      assert.equal(updated.treatmentStatus, 'completed');

      // Verify calendar medication is now deactivated (isActive === false)
      const meds2 = await calendarRepo.listMedicationsByPatient(patientA.userId);
      const deactivated = meds2.filter((m) => m.prescriptionId === rx.prescriptionId);
      assert.ok(deactivated.every((m) => m.isActive === false));
    });

    test('forbids another patient from changing prescription status (Patient Privacy)', async () => {
      const rx = await recordRepo.savePrescription({
        prescriptionId: 'rx-status-002',
        patientId: patientA.userId,
        fileName: 'rx.pdf',
        s3Key: `patients/${patientA.userId}/prescriptions/rx-status-002/rx.pdf`,
        mimeType: 'application/pdf',
        fileSize: 1024,
        status: 'confirmed',
        doctorName: 'Dr. Ramesh Sharma',
        prescriptionDate: '2026-09-18',
        medicines: [],
        createdAt: '2026-09-18T10:00:00.000Z',
        updatedAt: '2026-09-18T10:00:00.000Z',
      });

      await assert.rejects(
        async () => {
          await recordService.updatePrescriptionStatus(patientB, rx.prescriptionId, 'cured');
        },
        (err) => err instanceof ForbiddenError
      );
    });
  });

  describe('Part B: Doctor Availability & Lunch Break Respect', () => {
    test('computes available slots respecting working hours and excluding lunch breaks', async () => {
      // Sharda Hospital Dr. Ramesh Sharma works Monday 09:00 - 13:00
      const doctors = await hospitalRepo.getDoctors(SHARDA_HOSPITAL_ID);
      const drRamesh = doctors.find((d) => d.name.includes('Ramesh Sharma'));
      assert.ok(drRamesh);

      // Pick a known Monday in future: 2026-09-28 is a Monday
      const avail = await hospitalService.computeDoctorAvailability(
        SHARDA_HOSPITAL_ID,
        drRamesh.doctorId,
        '2026-09-28'
      );

      assert.equal(avail.dayOfWeek, 'Monday');
      assert.ok(avail.availableSlots.length > 0);
      assert.ok(avail.availableSlots.includes('09:00'));
      assert.ok(avail.availableSlots.includes('09:20'));
    });
  });

  describe('Part C: Patient Context Privacy Isolation in AI Chatbot', () => {
    test('Patient B cannot access Patient A confidential records via AI query', async () => {
      // Patient A has Telmisartan in confirmed records
      const chatA = await aiService.patientChat(patientA, {
        query: 'What medication am I taking?',
      });
      assert.ok(chatA.reply.includes('Telmisartan'));

      // Patient B (no records) asking the same question should get strictly no information
      const chatB = await aiService.patientChat(patientB, {
        query: 'What medication am I taking?',
      });
      assert.equal(chatB.reply, "I don't have that information.");
      assert.equal(chatB.citations.length, 0);
    });
  });

  describe('Part D: Safe Symptom Triage Structured Schema', () => {
    test('produces structured safe triage with urgency and specialist recommendations', async () => {
      const evalSession = await aiService.submitSymptoms({
        symptoms: 'Mild headache and eye strain after 8 hours working on computer',
      });

      const result = await aiService.recommendSpecialist({
        sessionId: evalSession.sessionId,
        answers: ['No fever', 'Duration 2 days'],
      });

      assert.ok(result.disclaimer);
      assert.ok(result.recommendedSpecialty);
      assert.ok(result.urgency);
      assert.ok(result.reasoning);
      assert.ok(Array.isArray(result.possibleCategories));
      assert.ok(Array.isArray(result.suggestedHospitals));
      assert.ok(result.suggestedHospitals.length > 0);
    });
  });
});
