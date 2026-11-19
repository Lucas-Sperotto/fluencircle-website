/**
 * @file Mapas de atualização atômica de sessões, sem dependência do Firebase.
 *
 * Caminhos conhecidos apenas pela camada services/. Um update multicaminho
 * do Realtime Database aplica tudo ou rejeita tudo quando uma regra falha.
 * Isso não substitui regras de autorização nem resolve concorrência externa.
 */
import { DB_PATHS, dbPath } from './db-paths.js';

/** Impede ids malformados de construir caminhos inesperados do RTDB. */
function pathSegment(value, name) {
  if (typeof value !== 'string' || !value || /[.#$/\[\]\x00-\x1f\x7f]/.test(value)) {
    throw new TypeError(`${name} precisa ser um identificador válido do RTDB.`);
  }
  return value;
}

/**
 * Grava presença e índice reverso conjuntamente.
 *
 * Privacidade (Issue #10): a presença guarda só a data — nome e e-mail ficam
 * no perfil (`users`), que só a equipe lê. O índice do aluno guarda o resumo
 * da sessão (tema e início) para a tela de flashcards não precisar ler
 * `meeting_sessions`, onde estão as presenças de outras pessoas.
 *
 * @param {string} sessionId @param {string} uid
 * @param {{ topic: string, startedAt: string }} session resumo da sessão
 * @param {string} addedAt data ISO provida pelo serviço
 */
export function buildAddAttendeeUpdates(sessionId, uid, { topic, startedAt }, addedAt) {
  pathSegment(sessionId, 'sessionId');
  pathSegment(uid, 'uid');
  if (typeof topic !== 'string' || typeof startedAt !== 'string') {
    throw new TypeError('O índice de presença precisa do tema e do início da sessão.');
  }
  return {
    [dbPath(DB_PATHS.sessions, sessionId, 'attendees', uid)]: { addedAt },
    [dbPath(DB_PATHS.userSessions, uid, sessionId)]: { topic, startedAt },
  };
}

/** Apaga presença e índice reverso juntos; nunca silenciar erro parcial. */
export function buildRemoveAttendeeUpdates(sessionId, uid) {
  pathSegment(sessionId, 'sessionId');
  pathSegment(uid, 'uid');
  return {
    [dbPath(DB_PATHS.sessions, sessionId, 'attendees', uid)]: null,
    [dbPath(DB_PATHS.userSessions, uid, sessionId)]: null,
  };
}

/**
 * Apaga sessão, flashcards e índices fornecidos numa única operação.
 * A lista de participantes deve estar atualizada: uma edição concorrente
 * posterior à leitura ainda requer tratamento no backend/Emulator.
 */
export function buildDeleteSessionUpdates(sessionId, attendeeUids = []) {
  pathSegment(sessionId, 'sessionId');
  if (!Array.isArray(attendeeUids)) throw new TypeError('attendeeUids precisa ser uma lista.');
  const updates = {
    [dbPath(DB_PATHS.sessions, sessionId)]: null,
    [dbPath(DB_PATHS.flashcards, sessionId)]: null,
  };
  for (const uid of attendeeUids) {
    pathSegment(uid, 'uid');
    updates[dbPath(DB_PATHS.userSessions, uid, sessionId)] = null;
  }
  return updates;
}
