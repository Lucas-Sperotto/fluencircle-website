/**
 * @file Flashcards de cada sessão (`flashcards/{sessionId}/{cardId}`).
 */
import { database, ref, get, set, push, update, remove } from '../core/firebase.js';
import { nowIso } from '../domain/format.js';
import { DB_PATHS, dbPath } from './db-paths.js';

/**
 * @typedef {Object} Flashcard
 * @property {string} front termo (frente)
 * @property {string} back tradução (verso)
 * @property {string} [topic]
 * @property {string} [sessionId]
 * @property {string} [createdAt]
 */

/**
 * Todos os flashcards, agrupados por sessão.
 *
 * Atenção ao custo: baixa o nó inteiro. É o comportamento herdado das telas de
 * flashcards e de sessões; a evolução recomendada (índice `user_sessions` e
 * `flashcardCount`) está em docs/ARQUITETURA.md.
 *
 * @returns {Promise<Record<string, Record<string, Flashcard>>>}
 */
export async function listAllFlashcards() {
  const snapshot = await get(ref(database, DB_PATHS.flashcards));
  return snapshot.exists() ? snapshot.val() : {};
}

/**
 * @param {string} sessionId
 * @returns {Promise<Record<string, Flashcard>>}
 */
export async function listSessionFlashcards(sessionId) {
  const snapshot = await get(ref(database, dbPath(DB_PATHS.flashcards, sessionId)));
  return snapshot.exists() ? snapshot.val() : {};
}

/**
 * Cria um flashcard na sessão. Também é usado pelo tradutor público, que
 * grava sem login — por isso as regras precisam validar tamanho e formato.
 *
 * @param {string} sessionId
 * @param {{ front: string, back: string, topic: string }} card
 * @returns {Promise<string>} id do card
 */
export async function addFlashcard(sessionId, { front, back, topic }) {
  const cardRef = push(ref(database, dbPath(DB_PATHS.flashcards, sessionId)));
  await set(cardRef, { front, back, topic, sessionId, createdAt: nowIso() });
  return cardRef.key;
}

/**
 * @param {string} sessionId
 * @param {string} cardId
 * @param {{ front: string, back: string }} card
 */
export function updateFlashcard(sessionId, cardId, { front, back }) {
  return update(ref(database, dbPath(DB_PATHS.flashcards, sessionId, cardId)), { front, back });
}

/**
 * @param {string} sessionId
 * @param {string} cardId
 */
export function deleteFlashcard(sessionId, cardId) {
  return remove(ref(database, dbPath(DB_PATHS.flashcards, sessionId, cardId)));
}
