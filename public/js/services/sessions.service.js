/**
 * @file Sessões de conversação (`meeting_sessions`), presença e sessão ativa.
 *
 * `current_session` é um nó único lido pelo tradutor público para saber em
 * qual sessão salvar os flashcards. Limitação conhecida: dois mediadores ao
 * mesmo tempo sobrescrevem um ao outro (ver docs/ARQUITETURA.md).
 */
import { database, ref, get, set, push, update, remove, onValue, onDisconnect } from '../core/firebase.js';
import { nowIso } from '../domain/format.js';
import { DB_PATHS, dbPath } from './db-paths.js';

/**
 * @typedef {Object} Session
 * @property {string} [templateId] id do tema usado
 * @property {string} [topic]
 * @property {string} [startedAt]
 * @property {string} [mediatorEmail]
 * @property {Record<string, { name: string, email: string, addedAt: string }>} [attendees]
 */

/** @returns {Promise<Record<string, Session>>} todas as sessões, por id */
export async function listSessions() {
  const snapshot = await get(ref(database, DB_PATHS.sessions));
  return snapshot.exists() ? snapshot.val() : {};
}

/**
 * Registra o início de uma sessão.
 * @param {{ templateId: string, topic: string, mediatorEmail: string }} data
 * @returns {Promise<string>} id da sessão
 */
export async function createSession({ templateId, topic, mediatorEmail }) {
  const sessionRef = push(ref(database, DB_PATHS.sessions));
  await set(sessionRef, { templateId, topic, startedAt: nowIso(), mediatorEmail, attendees: {} });
  return sessionRef.key;
}

/**
 * Publica a sessão como ativa para o tradutor público.
 *
 * Usa `onDisconnect`: se a aba fechar ou a conexão cair, o próprio servidor
 * apaga `current_session` (antes dependia do `beforeunload`, que falha com
 * frequência). Ao reconectar, a sessão é publicada de novo.
 *
 * @param {{ sessionId: string, topic: string }} data
 * @returns {Promise<() => Promise<void>>} função que encerra a publicação
 */
export async function publishCurrentSession({ sessionId, topic }) {
  const currentRef = ref(database, DB_PATHS.currentSession);
  const payload = { sessionId, topic, startedAt: nowIso() };

  await onDisconnect(currentRef).remove();
  await set(currentRef, payload);

  const stopWatching = onValue(ref(database, '.info/connected'), (snapshot) => {
    if (snapshot.val() !== true) return;
    onDisconnect(currentRef).remove()
      .then(() => set(currentRef, payload))
      .catch((error) => console.error('Erro ao republicar a sessão ativa:', error));
  });

  return async function unpublish() {
    stopWatching();
    await onDisconnect(currentRef).cancel().catch(() => {});
    await remove(currentRef);
  };
}

/**
 * Observa a sessão ativa (usado pelo tradutor público).
 * @param {(session: { sessionId: string, topic: string } | null) => void} callback
 * @returns {() => void} função para parar de observar
 */
export function watchCurrentSession(callback) {
  return onValue(ref(database, DB_PATHS.currentSession), (snapshot) => {
    const value = snapshot.val();
    callback(value && value.sessionId ? value : null);
  });
}

/**
 * Marca presença na sessão e no índice do aluno numa escrita atômica.
 * @param {string} sessionId
 * @param {string} uid
 * @param {{ name: string, email: string }} attendee
 */
export function addAttendee(sessionId, uid, { name, email }) {
  return update(ref(database), {
    [dbPath(DB_PATHS.sessions, sessionId, 'attendees', uid)]: { name, email, addedAt: nowIso() },
    [dbPath(DB_PATHS.userSessions, uid, sessionId)]: true,
  });
}

/**
 * Remove a presença. Agora também limpa o índice `user_sessions` (antes ficava
 * para trás). A limpeza é separada para não impedir a remoção principal caso
 * as regras do banco não permitam apagar o índice.
 * @param {string} sessionId
 * @param {string} uid
 */
export async function removeAttendee(sessionId, uid) {
  await remove(ref(database, dbPath(DB_PATHS.sessions, sessionId, 'attendees', uid)));
  await remove(ref(database, dbPath(DB_PATHS.userSessions, uid, sessionId)))
    .catch((error) => console.warn('Índice user_sessions não removido:', error));
}

/**
 * Apaga a sessão e seus flashcards; depois limpa o índice dos participantes.
 * @param {string} sessionId
 * @param {string[]} attendeeUids
 */
export async function deleteSession(sessionId, attendeeUids = []) {
  await Promise.all([
    remove(ref(database, dbPath(DB_PATHS.sessions, sessionId))),
    remove(ref(database, dbPath(DB_PATHS.flashcards, sessionId))),
  ]);
  if (attendeeUids.length === 0) return;
  const cleanup = Object.fromEntries(
    attendeeUids.map((uid) => [dbPath(DB_PATHS.userSessions, uid, sessionId), null]),
  );
  await update(ref(database), cleanup)
    .catch((error) => console.warn('Índice user_sessions não removido:', error));
}
