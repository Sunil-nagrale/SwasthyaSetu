import { env } from '../config/env.js';
import { InternalServerError } from '../utils/errors.js';
import {
  HospitalChatResponse,
  PatientChatResponse,
  SymptomEvaluationResponse,
  SpecialistRecommendationResponse,
  ChatMessage,
} from '../types/ai.js';
import { ExtractedMedicine, ExtractedFinding, Prescription, MedicalReport } from '../types/record.js';
import { Hospital, Department, Doctor, LabTest } from '../types/hospital.js';
import { IBedrockService, AI_DISCLAIMER } from './bedrock.client.js';
import { PRESCRIPTION_EXTRACT_SYSTEM_PROMPT } from '../lib/ai/prompts/prescription-extract.js';
import { REPORT_EXTRACT_SYSTEM_PROMPT } from '../lib/ai/prompts/report-extract.js';
import { HOSPITAL_CHAT_SYSTEM_PROMPT } from '../lib/ai/prompts/hospital-chat.js';
import { PATIENT_CHAT_SYSTEM_PROMPT } from '../lib/ai/prompts/patient-chat.js';
import {
  SYMPTOM_TRIAGE_SYSTEM_PROMPT,
  FOLLOWUP_QUESTIONS_SYSTEM_PROMPT,
  SPECIALIST_RECOMMENDATION_SYSTEM_PROMPT,
} from '../lib/ai/prompts/diagnosis.js';
import { z } from 'zod';

function parseJsonObject(text: string): unknown {
  const trimmed = text.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
  const candidate = fenced?.[1]?.trim() ?? trimmed;
  const start = candidate.indexOf('{');
  const end = candidate.lastIndexOf('}');
  if (start < 0 || end <= start) {
    throw new InternalServerError('Bedrock returned non-JSON output', 'ERR_AI_OUTPUT');
  }
  return JSON.parse(candidate.slice(start, end + 1));
}

export class AwsBedrockService implements IBedrockService {
  private async converse(system: string, user: string): Promise<string> {
    const { BedrockRuntimeClient, ConverseCommand } = await import(
      '@aws-sdk/client-bedrock-runtime'
    );
    const client = new BedrockRuntimeClient({ region: env.AWS_REGION });
    const guardrail =
      env.BEDROCK_GUARDRAIL_ID && env.BEDROCK_GUARDRAIL_VERSION
        ? {
            guardrailIdentifier: env.BEDROCK_GUARDRAIL_ID,
            guardrailVersion: env.BEDROCK_GUARDRAIL_VERSION,
          }
        : undefined;

    const result = await client.send(
      new ConverseCommand({
        modelId: env.BEDROCK_MODEL_ID,
        guardrailConfig: guardrail,
        system: [{ text: system }],
        messages: [{ role: 'user', content: [{ text: user }] }],
      })
    );

    const contentBlocks = result.output?.message?.content ?? [];
    const text = contentBlocks
      .map((part) => (typeof part.text === 'string' ? part.text : ''))
      .join('\n');
    if (!text) {
      throw new InternalServerError('Bedrock returned an empty response', 'ERR_AI_OUTPUT');
    }
    return text;
  }

  async extractPrescription(ocrText: string) {
    const raw = parseJsonObject(
      await this.converse(PRESCRIPTION_EXTRACT_SYSTEM_PROMPT, ocrText)
    );
    const schema = z.object({
      diagnosis: z.string().optional(),
      doctorName: z.string().optional(),
      hospitalName: z.string().optional(),
      prescriptionDate: z.string().optional(),
      medicines: z
        .array(
          z.object({
            name: z.string(),
            dosage: z.string(),
            frequency: z.string(),
            duration: z.string().optional(),
            instructions: z.string().optional(),
          })
        )
        .default([]),
    });
    return schema.parse(raw);
  }

  async extractReport(ocrText: string) {
    const raw = parseJsonObject(await this.converse(REPORT_EXTRACT_SYSTEM_PROMPT, ocrText));
    const schema = z.object({
      title: z.string(),
      testType: z.string().optional(),
      labName: z.string().optional(),
      reportDate: z.string().optional(),
      summary: z.string().optional(),
      findings: z
        .array(
          z.object({
            parameter: z.string(),
            value: z.string(),
            unit: z.string().optional(),
            referenceRange: z.string().optional(),
            status: z.enum(['normal', 'high', 'low', 'abnormal']),
            notes: z.string().optional(),
          })
        )
        .default([]),
    });
    return schema.parse(raw);
  }

  async hospitalChat(
    hospital: Hospital,
    departments: Department[],
    doctors: Doctor[],
    labs: LabTest[],
    query: string,
    history?: ChatMessage[]
  ): Promise<HospitalChatResponse> {
    const raw = parseJsonObject(
      await this.converse(
        HOSPITAL_CHAT_SYSTEM_PROMPT,
        JSON.stringify({ hospital, departments, doctors, labs, query, history })
      )
    );
    const schema = z.object({
      reply: z.string(),
      citations: z
        .array(
          z.object({
            type: z.enum(['doctor', 'department', 'schedule', 'facility', 'lab']),
            name: z.string(),
            detail: z.string().optional(),
          })
        )
        .default([]),
    });
    return schema.parse(raw);
  }

  async patientChat(
    prescriptions: Prescription[],
    reports: MedicalReport[],
    query: string,
    history?: ChatMessage[],
    patientContext?: import('../types/ai.js').PatientSafeAiContext
  ): Promise<PatientChatResponse> {
    const raw = parseJsonObject(
      await this.converse(
        PATIENT_CHAT_SYSTEM_PROMPT,
        JSON.stringify({ prescriptions, reports, query, history, patientContext })
      )
    );
    const schema = z.object({
      reply: z.string(),
      citations: z
        .array(
          z.object({
            recordName: z.string(),
            recordDate: z.string().optional(),
            sourcePage: z.number().optional(),
          })
        )
        .default([]),
    });
    return schema.parse(raw);
  }

  async evaluateSymptoms(symptoms: string): Promise<SymptomEvaluationResponse> {
    const raw = parseJsonObject(
      await this.converse(SYMPTOM_TRIAGE_SYSTEM_PROMPT, symptoms)
    );
    const schema = z.object({
      isEmergency: z.boolean(),
      urgentCareMessage: z.string().optional(),
      summary: z.string().optional(),
    });
    const parsed = schema.parse(raw);
    return {
      ...parsed,
      disclaimer: AI_DISCLAIMER,
    };
  }

  async generateFollowupQuestions(symptoms: string): Promise<string[]> {
    const raw = parseJsonObject(
      await this.converse(FOLLOWUP_QUESTIONS_SYSTEM_PROMPT, symptoms)
    );
    return z.object({ questions: z.array(z.string()).min(1) }).parse(raw).questions;
  }

  async recommendSpecialist(
    symptoms: string,
    answers: Record<string, string>
  ): Promise<SpecialistRecommendationResponse> {
    const raw = parseJsonObject(
      await this.converse(
        SPECIALIST_RECOMMENDATION_SYSTEM_PROMPT,
        JSON.stringify({ symptoms, answers })
      )
    );
    const parsed = z
      .object({
        recommendedSpecialty: z.string(),
        rationale: z.string(),
        symptomSummary: z.string().optional(),
        urgency: z.enum(['routine', 'soon', 'urgent', 'emergency']).optional(),
        emergencyWarning: z.string().optional(),
        suggestedSpecialty: z.string().optional(),
        possibleCategories: z.array(z.string()).optional(),
        reasoning: z.string().optional(),
        missingInformation: z.array(z.string()).optional(),
        recommendedNextStep: z.string().optional(),
      })
      .parse(raw);
    return {
      sessionId: '',
      recommendedSpecialty: parsed.recommendedSpecialty,
      rationale: parsed.rationale,
      disclaimer: AI_DISCLAIMER,
      symptomSummary: parsed.symptomSummary,
      urgency: parsed.urgency,
      emergencyWarning: parsed.emergencyWarning,
      suggestedSpecialty: parsed.suggestedSpecialty || parsed.recommendedSpecialty,
      possibleCategories: parsed.possibleCategories,
      reasoning: parsed.reasoning || parsed.rationale,
      missingInformation: parsed.missingInformation,
      recommendedNextStep: parsed.recommendedNextStep,
    };
  }
}

export function createBedrockService(useMock: boolean, mock: IBedrockService): IBedrockService {
  return useMock ? mock : new AwsBedrockService();
}
