import { z } from 'zod';

export const ChatMessageSchema = z.object({
  role: z.enum(['user', 'assistant', 'system']),
  content: z.string(),
});

export const HospitalChatSchema = z.object({
  hospitalId: z.string().min(1, 'hospitalId is required'),
  query: z.string().min(1, 'query is required').max(1000),
  conversationHistory: z.array(ChatMessageSchema).optional(),
});

export type HospitalChatInput = z.infer<typeof HospitalChatSchema>;

export const PatientChatSchema = z.object({
  query: z.string().min(1, 'query is required').max(1000),
  conversationHistory: z.array(ChatMessageSchema).optional(),
});

export type PatientChatInput = z.infer<typeof PatientChatSchema>;

export const SymptomSubmissionSchema = z.object({
  symptoms: z.string().min(3, 'symptoms must be at least 3 characters').max(2000),
  duration: z.string().optional(),
  severity: z.string().optional(),
});

export type SymptomSubmissionInput = z.infer<typeof SymptomSubmissionSchema>;

export const DiagnosisQuestionQuerySchema = z.object({
  sessionId: z.string().min(1, 'sessionId query parameter is required'),
});

export const DiagnosisResultSchema = z.object({
  sessionId: z.string().min(1, 'sessionId is required'),
  answers: z.record(z.string(), z.string()),
});

export type DiagnosisResultInput = z.infer<typeof DiagnosisResultSchema>;
