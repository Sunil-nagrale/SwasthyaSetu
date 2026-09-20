import { apiClient } from './client';

export interface ChatMessagePayload {
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

export const chatbotApi = {
  async hospitalChat(
    hospitalId: string,
    query: string,
    conversationHistory?: ChatMessagePayload[]
  ): Promise<HospitalChatResponse> {
    return apiClient<HospitalChatResponse>('/chatbot/hospital', {
      method: 'POST',
      body: JSON.stringify({
        hospitalId,
        query,
        ...(conversationHistory ? { conversationHistory } : {}),
      }),
    });
  },

  async patientChat(
    query: string,
    conversationHistory?: ChatMessagePayload[]
  ): Promise<PatientChatResponse> {
    return apiClient<PatientChatResponse>('/chatbot/patient', {
      method: 'POST',
      body: JSON.stringify({
        query,
        ...(conversationHistory ? { conversationHistory } : {}),
      }),
    });
  },
};
