/**
 * @file Nomes dos nós do Realtime Database.
 *
 * Os nomes antigos foram mantidos (os dados de produção dependem deles).
 * Repare que `meetings` guarda os TEMAS e `meeting_sessions` as SESSÕES realizadas;
 * renomear exigiria migrar os dados — ver docs/ARQUITETURA.md.
 *
 * Só a camada `services/` deve conhecer estes caminhos.
 */
export const DB_PATHS = Object.freeze({
  /** users/{uid} → { firstName, lastName, email, role, createdAt, updatedAt } */
  users: 'users',
  /** deleted_users/{uid} → { deletedAt, deletedBy } (lista de bloqueio) */
  deletedUsers: 'deleted_users',
  /** meetings/{themeId} → { topic, questions[], createdAt, updatedAt } */
  themes: 'meetings',
  /** meeting_sessions/{sessionId} → { templateId, topic, startedAt, mediatorEmail, attendees/{uid} } */
  sessions: 'meeting_sessions',
  /** current_session → { sessionId, topic, startedAt } — lido pelo tradutor público */
  currentSession: 'current_session',
  /** flashcards/{sessionId}/{cardId} → { front, back, topic, sessionId, createdAt } */
  flashcards: 'flashcards',
  /** student_reviews/{uid}/{sessionId} → { stage, lastReviewedAt, stageNCompletedAt } */
  reviews: 'student_reviews',
  /** user_sessions/{uid}/{sessionId} → true (índice de presença por aluno) */
  userSessions: 'user_sessions',
});

/**
 * Monta um caminho a partir de partes: `dbPath('meetings', id)` → `'meetings/<id>'`.
 * @param {...string} parts
 */
export const dbPath = (...parts) => parts.join('/');
