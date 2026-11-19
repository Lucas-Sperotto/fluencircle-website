/**
 * @file Progresso de revisão espaçada de cada aluno (`student_reviews`).
 */
import { database, ref, get, update } from '../core/firebase.js';
import { DB_PATHS, dbPath } from './db-paths.js';

/**
 * @param {string} uid
 * @returns {Promise<Record<string, object>>} progresso por sessão
 */
export async function getStudentReviews(uid) {
  const snapshot = await get(ref(database, dbPath(DB_PATHS.reviews, uid)));
  return snapshot.exists() ? snapshot.val() : {};
}

/**
 * Grava a conclusão de uma etapa (registro montado por `buildStageCompletion`).
 * @param {string} uid
 * @param {string} sessionId
 * @param {object} record
 */
export function saveReviewProgress(uid, sessionId, record) {
  return update(ref(database, dbPath(DB_PATHS.reviews, uid, sessionId)), record);
}
