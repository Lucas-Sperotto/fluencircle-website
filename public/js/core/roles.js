/**
 * @file Papéis de usuário e seus rótulos. Fonte única para todo o site.
 *
 * Importante: esconder um botão por papel é só conveniência de interface.
 * Quem garante o acesso são as regras do banco (docs/firebase/).
 */

/** Valores gravados em `users/{uid}/role`. */
export const ROLES = Object.freeze({
  STUDENT: 'student',
  MEDIATOR: 'mediator',
  ADMIN: 'admin',
});

/** Rótulos exibidos na interface (badge do cabeçalho, tabela e formulário do admin). */
export const ROLE_LABELS = Object.freeze({
  [ROLES.STUDENT]: 'Aluno',
  [ROLES.MEDIATOR]: 'Mediador',
  [ROLES.ADMIN]: 'Administrador',
});

/** Papéis da equipe: podem conduzir sessões, editar temas e flashcards. */
export const STAFF_ROLES = Object.freeze([ROLES.MEDIATOR, ROLES.ADMIN]);

/**
 * Converte qualquer valor em um papel válido. Ausente ou desconhecido vira aluno,
 * que é o papel com menos acesso.
 * @param {unknown} role
 * @returns {string}
 */
export function normalizeRole(role) {
  return Object.values(ROLES).includes(role) ? role : ROLES.STUDENT;
}

/** @param {string} role @returns {string} rótulo em português */
export function roleLabel(role) {
  return ROLE_LABELS[normalizeRole(role)];
}

/** @param {string} role @returns {boolean} true para mediador ou administrador */
export function isStaff(role) {
  return STAFF_ROLES.includes(role);
}

/**
 * @param {string} role
 * @param {readonly string[]} allowed
 * @returns {boolean}
 */
export function hasRole(role, allowed) {
  return allowed.includes(role);
}
