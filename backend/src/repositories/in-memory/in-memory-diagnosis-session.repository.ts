import {
  DiagnosisSession,
  IDiagnosisSessionRepository,
} from '../interfaces/diagnosis-session.repository.js';

export class InMemoryDiagnosisSessionRepository implements IDiagnosisSessionRepository {
  private sessions = new Map<string, DiagnosisSession>();

  async save(session: DiagnosisSession): Promise<DiagnosisSession> {
    this.sessions.set(session.sessionId, { ...session });
    return { ...session };
  }

  async getById(sessionId: string): Promise<DiagnosisSession | null> {
    const session = this.sessions.get(sessionId);
    return session ? { ...session } : null;
  }
}

export const inMemoryDiagnosisSessionRepo = new InMemoryDiagnosisSessionRepository();
