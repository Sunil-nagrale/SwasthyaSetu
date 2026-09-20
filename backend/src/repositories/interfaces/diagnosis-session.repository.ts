export interface DiagnosisSession {
  sessionId: string;
  symptoms: string;
  duration?: string;
  severity?: string;
  isEmergency: boolean;
  urgentCareMessage?: string;
  createdAt: string;
}

export interface IDiagnosisSessionRepository {
  save(session: DiagnosisSession): Promise<DiagnosisSession>;
  getById(sessionId: string): Promise<DiagnosisSession | null>;
}
