/**
 * @file Planos (`plans`) e agenda da semana (`weekly_sessions`) — PR #2 / ADR-005.
 *
 * Quem lê o quê (regras em firebase/rules/database.rules.source.mjs):
 * - equipe: catálogo inteiro e a semana inteira;
 * - participante: só o próprio plano e, um a um, os encontros dele.
 */
import { database, ref, get, set, push, update, remove } from '../core/firebase.js';
import { nowIso } from '../domain/format.js';
import { planSessions, slotKey } from '../domain/plans.js';
import { DB_PATHS, dbPath } from './db-paths.js';

/** @returns {Promise<Record<string, object>>} planos por id (equipe) */
export async function listPlans() {
  const snapshot = await get(ref(database, DB_PATHS.plans));
  return snapshot.exists() ? snapshot.val() : {};
}

/**
 * @param {string} planId
 * @returns {Promise<object|null>}
 */
export async function getPlan(planId) {
  const snapshot = await get(ref(database, dbPath(DB_PATHS.plans, planId)));
  return snapshot.exists() ? snapshot.val() : null;
}

/**
 * Cria (sem id) ou atualiza um plano já validado por `validatePlanInput`.
 * @param {string|null} planId
 * @param {{ name: string, price: number, description?: string, sessions: object[] }} plan
 * @returns {Promise<string>} id do plano
 */
export async function savePlan(planId, { name, price, description = '', sessions }) {
  const now = nowIso();
  const base = { name, price, sessions, updatedAt: now };
  if (planId) {
    // update() troca `sessions` inteiro; description null apaga a descrição antiga
    await update(ref(database, dbPath(DB_PATHS.plans, planId)), { ...base, description: description || null });
    return planId;
  }
  const planRef = push(ref(database, DB_PATHS.plans));
  await set(planRef, { ...base, ...(description ? { description } : {}), createdAt: now });
  return planRef.key;
}

/** @param {string} planId */
export function deletePlan(planId) {
  return remove(ref(database, dbPath(DB_PATHS.plans, planId)));
}

/**
 * Encontros gravados de uma semana inteira (equipe).
 * @param {string} weekKey ex.: "2026-W47"
 * @returns {Promise<Record<string, object>>}
 */
export async function getWeekSchedule(weekKey) {
  const snapshot = await get(ref(database, dbPath(DB_PATHS.weeklySessions, weekKey)));
  return snapshot.exists() ? snapshot.val() : {};
}

/**
 * Encontros da semana de UM plano, lidos um a um (é o que as regras permitem
 * ao participante). Um encontro sem tema volta ausente.
 * @param {string} weekKey
 * @param {string} planId
 * @param {object} plan
 * @returns {Promise<Record<string, object>>}
 */
export async function getPlanWeekSchedule(weekKey, planId, plan) {
  const keys = planSessions(plan).map((s) => slotKey(planId, s.dayOfWeek, s.index));
  const snapshots = await Promise.all(keys.map((key) => get(ref(database, dbPath(DB_PATHS.weeklySessions, weekKey, key)))));
  const schedule = {};
  snapshots.forEach((snapshot, i) => { if (snapshot.exists()) schedule[keys[i]] = snapshot.val(); });
  return schedule;
}

/**
 * Define tema (copiando título e perguntas, que o aluno não lê em `meetings`) e link de um encontro.
 * @param {string} weekKey
 * @param {string} key slotKey
 * @param {{ topicId: string, topicTitle: string, questions: string[], meetLink?: string }} slot
 */
export function saveWeekSlot(weekKey, key, { topicId, topicTitle, questions, meetLink = '' }) {
  return set(ref(database, dbPath(DB_PATHS.weeklySessions, weekKey, key)), {
    topicId,
    topicTitle,
    ...(questions?.length ? { questions } : {}),
    ...(meetLink ? { meetLink } : {}),
    updatedAt: nowIso(),
  });
}

/** Remove tema e link de um encontro. */
export function clearWeekSlot(weekKey, key) {
  return remove(ref(database, dbPath(DB_PATHS.weeklySessions, weekKey, key)));
}
