import { apiClient } from './client';
import { SymptomEvaluation, FollowupQuestionResponse, SpecialistRecommendation } from '@/types';

export interface SubmitSymptomsPayload {
  symptoms: string;
  duration?: string;
  severity?: string;
}

export interface DiagnosisResultPayload {
  sessionId: string;
  answers: Record<string, string>;
}

export const diagnosisApi = {
  async submitSymptoms(payload: SubmitSymptomsPayload): Promise<SymptomEvaluation> {
    return apiClient<SymptomEvaluation>('/diagnosis/symptom', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async getQuestions(sessionId: string): Promise<FollowupQuestionResponse> {
    return apiClient<FollowupQuestionResponse>(`/diagnosis/question?sessionId=${encodeURIComponent(sessionId)}`);
  },

  async getResult(payload: DiagnosisResultPayload): Promise<SpecialistRecommendation> {
    return apiClient<SpecialistRecommendation>('/diagnosis/result', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },
};
