export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface HospitalChatCitation {
  type: 'doctor' | 'department' | 'schedule' | 'facility' | 'lab';
  name: string;
  detail?: string;
}

export interface HospitalChatResponse {
  reply: string;
  citations: HospitalChatCitation[];
}

export interface PatientChatCitation {
  recordName: string;
  recordDate?: string;
  sourcePage?: number;
}

export interface PatientChatResponse {
  reply: string;
  citations: PatientChatCitation[];
}

export interface SymptomEvaluationResponse {
  isEmergency: boolean;
  urgentCareMessage?: string;
  sessionId?: string;
  summary?: string;
  disclaimer: string;
}

export interface FollowupQuestionResponse {
  sessionId: string;
  questions: string[];
  disclaimer: string;
}

export interface SpecialistRecommendationResponse {
  sessionId: string;
  recommendedSpecialty: string;
  rationale: string;
  disclaimer: string;
  symptomSummary?: string;
  urgency?: 'routine' | 'soon' | 'urgent' | 'emergency';
  emergencyWarning?: string;
  suggestedSpecialty?: string;
  possibleCategories?: string[];
  reasoning?: string;
  missingInformation?: string[];
  recommendedNextStep?: string;
  suggestedHospitals?: Array<{
    hospitalId: string;
    name: string;
    city: string;
    departments?: Array<{ departmentId: string; name: string }>;
    doctors?: Array<{ doctorId: string; name: string; specialty: string; timings: string }>;
  }>;
}

export interface PatientSafeAiContext {
  patientProfile?: {
    name: string;
    gender?: string;
    bloodGroup?: string;
    allergies?: string[];
    knownConditions?: string[];
  };
  ongoingPrescriptions: Array<{
    prescriptionId: string;
    doctorName?: string;
    hospitalName?: string;
    prescriptionDate?: string;
    diagnosis?: string;
    treatmentStatus: string;
    medicines: Array<{
      name: string;
      dosage: string;
      frequency: string;
      duration?: string;
      instructions?: string;
    }>;
  }>;
  completedPrescriptions: Array<{
    prescriptionId: string;
    doctorName?: string;
    hospitalName?: string;
    prescriptionDate?: string;
    diagnosis?: string;
    treatmentStatus: string;
    medicines: Array<{
      name: string;
      dosage: string;
    }>;
  }>;
  reports: Array<{
    reportId: string;
    title: string;
    testType?: string;
    labName?: string;
    reportDate?: string;
    summary?: string;
    findings: Array<{
      parameter: string;
      value: string;
      unit?: string;
      referenceRange?: string;
      status: string;
    }>;
  }>;
  appointments: Array<{
    appointmentId: string;
    hospitalName: string;
    doctorName: string;
    specialty?: string;
    preferredDate: string;
    preferredTime: string;
    status: string;
    patientVisitNote?: string;
  }>;
  activeMedications: Array<{
    name: string;
    dosage: string;
    frequency: string;
    instructions?: string;
    startDate?: string;
  }>;
}
