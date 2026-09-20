import {
  DiagnosisSession,
  IDiagnosisSessionRepository,
} from '../interfaces/diagnosis-session.repository.js';
import { getItem, putItem, stripKeys } from './document.js';

export class DynamoDiagnosisSessionRepository implements IDiagnosisSessionRepository {
  async save(session: DiagnosisSession): Promise<DiagnosisSession> {
    await putItem({
      PK: `SESSION#${session.sessionId}`,
      SK: 'METADATA',
      entityType: 'diagnosis_session',
      ...session,
    });
    return session;
  }

  async getById(sessionId: string): Promise<DiagnosisSession | null> {
    const item = await getItem(`SESSION#${sessionId}`, 'METADATA');
    return item ? stripKeys<DiagnosisSession>(item) : null;
  }
}

export const dynamoDiagnosisSessionRepo = new DynamoDiagnosisSessionRepository();
