import { randomUUID } from 'node:crypto';
import { IHospitalRepository } from '../repositories/interfaces/hospital.repository.js';
import { IRecordRepository } from '../repositories/interfaces/record.repository.js';
import { IDiagnosisSessionRepository } from '../repositories/interfaces/diagnosis-session.repository.js';
import { IUserRepository } from '../repositories/interfaces/user.repository.js';
import { IAppointmentRepository } from '../repositories/interfaces/appointment.repository.js';
import { ICalendarRepository } from '../repositories/interfaces/calendar.repository.js';
import {
  hospitalRepo as defaultHospitalRepo,
  recordRepo as defaultRecordRepo,
  diagnosisSessionRepo as defaultDiagnosisSessionRepo,
  bedrockService as defaultBedrockService,
  userRepo as defaultUserRepo,
  appointmentRepo as defaultAppointmentRepo,
  calendarRepo as defaultCalendarRepo,
} from '../repositories/container.js';
import { IBedrockService } from '../aws/bedrock.client.js';
import { AuthContext } from '../types/auth.js';
import {
  HospitalChatInput,
  PatientChatInput,
  SymptomSubmissionInput,
  DiagnosisResultInput,
} from '../validators/ai.validator.js';
import {
  HospitalChatResponse,
  PatientChatResponse,
  SymptomEvaluationResponse,
  FollowupQuestionResponse,
  SpecialistRecommendationResponse,
  PatientSafeAiContext,
} from '../types/ai.js';
import { Prescription, MedicalReport } from '../types/record.js';
import { NotFoundError, BadRequestError } from '../utils/errors.js';

const DIAGNOSIS_DISCLAIMER =
  'This feature provides general guidance only. It is not a medical diagnosis or emergency service.';

export class AiService {
  constructor(
    private hospitalRepo: IHospitalRepository = defaultHospitalRepo,
    private recordRepo: IRecordRepository = defaultRecordRepo,
    private bedrock: IBedrockService = defaultBedrockService,
    private diagnosisSessions: IDiagnosisSessionRepository = defaultDiagnosisSessionRepo,
    private userRepo: IUserRepository = defaultUserRepo,
    private appointmentRepo: IAppointmentRepository = defaultAppointmentRepo,
    private calendarRepo: ICalendarRepository = defaultCalendarRepo
  ) {}

  async hospitalChat(
    _auth: AuthContext,
    input: HospitalChatInput
  ): Promise<HospitalChatResponse> {
    const hospital = await this.hospitalRepo.getHospitalById(input.hospitalId);
    if (!hospital) {
      throw new NotFoundError(`Hospital '${input.hospitalId}' not found`, 'ERR_NOT_FOUND');
    }

    const departments = await this.hospitalRepo.getDepartments(input.hospitalId);
    const doctors = await this.hospitalRepo.getDoctors(input.hospitalId);
    const labs = await this.hospitalRepo.getLabTests(input.hospitalId);

    return this.bedrock.hospitalChat(
      hospital,
      departments,
      doctors,
      labs,
      input.query,
      input.conversationHistory
    );
  }

  async patientChat(
    auth: AuthContext,
    input: PatientChatInput
  ): Promise<PatientChatResponse> {
    // 1. Fetch only authenticated patient's records
    const [patientProfile, prescriptions, reports, appointmentsPaginated, ongoingMeds] =
      await Promise.all([
        this.userRepo.getProfile(auth.userId),
        this.recordRepo.listPrescriptionsByPatient(auth.userId),
        this.recordRepo.listReportsByPatient(auth.userId),
        this.appointmentRepo.listByPatient(auth.userId, 1, 20),
        this.calendarRepo.listMedicationsByPatient(auth.userId),
      ]);

    // Contract Section 14: Personal Health Chatbot retrieves only confirmed records
    const confirmedPrescriptions = prescriptions.filter((p: Prescription) => p.status === 'confirmed');
    const confirmedReports = reports.filter((r: MedicalReport) => r.status === 'confirmed');

    // 2. Build structured, sanitized context isolated strictly to this patient
    const ongoingRx = confirmedPrescriptions.filter(
      (p) => p.treatmentStatus !== 'completed' && p.treatmentStatus !== 'cured'
    );
    const completedRx = confirmedPrescriptions.filter(
      (p) => p.treatmentStatus === 'completed' || p.treatmentStatus === 'cured'
    );

    const safeContext: PatientSafeAiContext = {
      patientProfile: patientProfile
        ? {
            name: patientProfile.name,
            gender: patientProfile.gender,
            bloodGroup: patientProfile.bloodGroup,
            allergies: patientProfile.allergies || [],
            knownConditions: patientProfile.knownConditions || [],
          }
        : undefined,
      ongoingPrescriptions: ongoingRx.map((p) => ({
        prescriptionId: p.prescriptionId,
        doctorName: p.doctorName,
        hospitalName: p.hospitalName,
        prescriptionDate: p.prescriptionDate,
        diagnosis: p.diagnosis,
        treatmentStatus: p.treatmentStatus || 'ongoing',
        medicines: p.medicines.map((m) => ({
          name: m.name,
          dosage: m.dosage,
          frequency: m.frequency,
          duration: m.duration,
          instructions: m.instructions,
        })),
      })),
      completedPrescriptions: completedRx.map((p) => ({
        prescriptionId: p.prescriptionId,
        doctorName: p.doctorName,
        hospitalName: p.hospitalName,
        prescriptionDate: p.prescriptionDate,
        diagnosis: p.diagnosis,
        treatmentStatus: p.treatmentStatus || 'completed',
        medicines: p.medicines.map((m) => ({
          name: m.name,
          dosage: m.dosage,
        })),
      })),
      reports: confirmedReports.map((r) => ({
        reportId: r.reportId,
        title: r.title,
        testType: r.testType,
        labName: r.labName,
        reportDate: r.reportDate,
        summary: r.summary,
        findings: r.findings.map((f) => ({
          parameter: f.parameter,
          value: f.value,
          unit: f.unit,
          referenceRange: f.referenceRange,
          status: f.status,
        })),
      })),
      appointments: appointmentsPaginated.items.map((a) => ({
        appointmentId: a.appointmentId,
        hospitalName: a.hospitalSnapshot?.name || 'Hospital',
        doctorName: a.doctorSnapshot?.name || 'Doctor',
        specialty: a.doctorSnapshot?.specialty,
        preferredDate: a.preferredDate,
        preferredTime: a.preferredTime,
        status: a.status,
        patientVisitNote: a.patientVisitNote,
      })),
      activeMedications: ongoingMeds
        .filter((m) => m.isActive !== false)
        .map((m) => ({
          name: m.name,
          dosage: m.dosage,
          frequency: m.frequency,
          instructions: m.instructions,
          startDate: m.startDate,
        })),
    };

    return this.bedrock.patientChat(
      confirmedPrescriptions,
      confirmedReports,
      input.query,
      input.conversationHistory,
      safeContext
    );
  }

  async submitSymptoms(input: SymptomSubmissionInput): Promise<SymptomEvaluationResponse> {
    const evaluation = await this.bedrock.evaluateSymptoms(input.symptoms);
    const sessionId = evaluation.sessionId || randomUUID();

    await this.diagnosisSessions.save({
      sessionId,
      symptoms: input.symptoms,
      duration: input.duration,
      severity: input.severity,
      isEmergency: evaluation.isEmergency,
      urgentCareMessage: evaluation.urgentCareMessage,
      createdAt: new Date().toISOString(),
    });

    return {
      ...evaluation,
      sessionId,
      disclaimer: evaluation.disclaimer || DIAGNOSIS_DISCLAIMER,
    };
  }

  async getFollowupQuestions(sessionId: string): Promise<FollowupQuestionResponse> {
    const session = await this.requireDiagnosisSession(sessionId);
    this.assertDiagnosisNotEmergency(session.isEmergency, session.urgentCareMessage);

    const questions = await this.bedrock.generateFollowupQuestions(session.symptoms);
    return {
      sessionId: session.sessionId,
      questions,
      disclaimer: DIAGNOSIS_DISCLAIMER,
    };
  }

  async recommendSpecialist(
    input: DiagnosisResultInput
  ): Promise<SpecialistRecommendationResponse> {
    const session = await this.requireDiagnosisSession(input.sessionId);
    this.assertDiagnosisNotEmergency(session.isEmergency, session.urgentCareMessage);

    const recommendation = await this.bedrock.recommendSpecialist(
      session.symptoms,
      input.answers
    );

    // Retrieve verified matching hospitals with this specialty from repository
    const matchingHospitals = await this.hospitalRepo.findHospitals(
      { specialty: recommendation.recommendedSpecialty, city: 'Greater Noida' },
      1,
      4
    );

    const suggestedHospitalsWithDetails = await Promise.all(
      matchingHospitals.items.map(async (h) => {
        const [depts, docs] = await Promise.all([
          this.hospitalRepo.getDepartments(h.hospitalId),
          this.hospitalRepo.getDoctors(h.hospitalId),
        ]);
        const matchingDocs = docs.filter(
          (d) => d.specialty.toLowerCase() === recommendation.recommendedSpecialty.toLowerCase()
        );
        return {
          hospitalId: h.hospitalId,
          name: h.name,
          city: h.city,
          departments: depts.map((d) => ({ departmentId: d.departmentId, name: d.name })),
          doctors: (matchingDocs.length > 0 ? matchingDocs : docs.slice(0, 2)).map((d) => ({
            doctorId: d.doctorId,
            name: d.name,
            specialty: d.specialty,
            timings: d.timings,
          })),
        };
      })
    );

    return {
      ...recommendation,
      sessionId: session.sessionId,
      disclaimer: recommendation.disclaimer || DIAGNOSIS_DISCLAIMER,
      suggestedHospitals:
        suggestedHospitalsWithDetails.length > 0
          ? suggestedHospitalsWithDetails
          : recommendation.suggestedHospitals,
    };
  }

  private async requireDiagnosisSession(sessionId: string) {
    const session = await this.diagnosisSessions.getById(sessionId);
    if (!session) {
      throw new NotFoundError(`Diagnosis session '${sessionId}' not found`, 'ERR_NOT_FOUND');
    }
    return session;
  }

  private assertDiagnosisNotEmergency(isEmergency: boolean, urgentCareMessage?: string): void {
    if (!isEmergency) return;
    throw new BadRequestError(
      urgentCareMessage ||
        'EMERGENCY ALERT: This session was halted because the reported symptoms require urgent in-person care. SwasthyaSetu is not an emergency service.',
      'ERR_EMERGENCY_HALT'
    );
  }
}

export const aiService = new AiService();
