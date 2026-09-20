import {
  HospitalChatResponse,
  PatientChatResponse,
  SymptomEvaluationResponse,
  SpecialistRecommendationResponse,
  ChatMessage,
} from '../types/ai.js';
import { ExtractedMedicine, ExtractedFinding } from '../types/record.js';
import { Hospital, Department, Doctor, LabTest } from '../types/hospital.js';
import { Prescription, MedicalReport } from '../types/record.js';

export const AI_DISCLAIMER =
  'This feature provides general guidance only. It is not a medical diagnosis or emergency service.';

export interface IBedrockService {
  extractPrescription(ocrText: string): Promise<{
    diagnosis?: string;
    doctorName?: string;
    hospitalName?: string;
    prescriptionDate?: string;
    medicines: ExtractedMedicine[];
  }>;

  extractReport(ocrText: string): Promise<{
    title: string;
    testType?: string;
    labName?: string;
    reportDate?: string;
    findings: ExtractedFinding[];
    summary?: string;
  }>;

  hospitalChat(
    hospital: Hospital,
    departments: Department[],
    doctors: Doctor[],
    labs: LabTest[],
    query: string,
    history?: ChatMessage[]
  ): Promise<HospitalChatResponse>;

  patientChat(
    prescriptions: Prescription[],
    reports: MedicalReport[],
    query: string,
    history?: ChatMessage[]
  ): Promise<PatientChatResponse>;

  evaluateSymptoms(symptoms: string): Promise<SymptomEvaluationResponse>;

  generateFollowupQuestions(symptoms: string): Promise<string[]>;

  recommendSpecialist(
    symptoms: string,
    answers: Record<string, string>
  ): Promise<SpecialistRecommendationResponse>;
}
