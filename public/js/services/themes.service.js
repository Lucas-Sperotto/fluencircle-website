/**
 * @file Temas de conversa (nó `meetings`): título e perguntas de apoio.
 */
import { database, ref, get, set, push, update, remove } from '../core/firebase.js';
import { nowIso } from '../domain/format.js';
import { DB_PATHS, dbPath } from './db-paths.js';

/**
 * @typedef {Object} Theme
 * @property {string} topic título do tema
 * @property {string[]} questions perguntas de apoio
 * @property {string} [createdAt]
 * @property {string} [updatedAt]
 */

/**
 * Todos os temas, indexados pelo id (na ordem das chaves do Firebase).
 * @returns {Promise<Record<string, Theme>>}
 */
export async function listThemes() {
  const snapshot = await get(ref(database, DB_PATHS.themes));
  return snapshot.exists() ? snapshot.val() : {};
}

/**
 * @param {{ topic: string, questions: string[] }} theme
 * @returns {Promise<string>} id gerado pelo Firebase
 */
export async function createTheme({ topic, questions }) {
  const now = nowIso();
  const themeRef = push(ref(database, DB_PATHS.themes));
  await set(themeRef, { topic, questions, createdAt: now, updatedAt: now });
  return themeRef.key;
}

/**
 * @param {string} id
 * @param {{ topic: string, questions: string[] }} theme
 */
export function updateTheme(id, { topic, questions }) {
  return update(ref(database, dbPath(DB_PATHS.themes, id)), { topic, questions, updatedAt: nowIso() });
}

/** @param {string} id */
export function deleteTheme(id) {
  return remove(ref(database, dbPath(DB_PATHS.themes, id)));
}
