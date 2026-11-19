/**
 * @file Regras de exibição, busca e ordenação de usuários (funções puras).
 *
 * Antes, cada tela repetia esse cálculo três vezes (ordenar, filtrar, desenhar).
 */

/**
 * @typedef {Object} UserProfile
 * @property {string} uid
 * @property {string} [firstName]
 * @property {string} [lastName]
 * @property {string} [email]
 * @property {string} [role]
 */

/**
 * Nome exibido de um usuário.
 *
 * - Com nome e sobrenome: "Nome Sobrenome".
 * - Sem eles: o e-mail — inteiro (`emailMode: 'full'`) ou só a parte antes do @ (`'local'`).
 * - Sem e-mail: `fallback`.
 *
 * O painel de acessos usa `'local'` (o e-mail já aparece em outra coluna); a lista
 * de presença usa `'full'` para diferenciar alunos sem nome cadastrado.
 *
 * @param {Partial<UserProfile>} user
 * @param {{ emailMode?: 'local'|'full', fallback?: string }} [options]
 * @returns {string}
 */
export function displayName(user, { emailMode = 'local', fallback = 'Usuário Sem Nome' } = {}) {
  if (user?.firstName && user?.lastName) return `${user.firstName} ${user.lastName}`;
  if (user?.email) return emailMode === 'full' ? user.email : user.email.split('@')[0];
  return fallback;
}

/**
 * Ordena por nome de exibição, em ordem alfabética do português.
 * Não altera o array recebido.
 * @param {UserProfile[]} users
 * @param {{ emailMode?: 'local'|'full' }} [options]
 * @returns {UserProfile[]}
 */
export function sortUsersByName(users, { emailMode = 'local' } = {}) {
  const key = (u) => displayName(u, { emailMode, fallback: '' });
  return [...users].sort((a, b) => key(a).localeCompare(key(b), 'pt-BR', { sensitivity: 'accent' }));
}

/**
 * Filtra por trecho do nome de exibição ou do e-mail, sem diferenciar maiúsculas.
 * @param {UserProfile[]} users
 * @param {string} term texto digitado na busca
 * @param {{ emailMode?: 'local'|'full', fallback?: string, extraText?: (user: UserProfile) => string }} [options]
 *        `extraText`: outro texto pesquisável do usuário (ex.: nome do plano, no painel de acessos)
 * @returns {UserProfile[]}
 */
export function filterUsers(users, term, options = {}) {
  const needle = String(term ?? '').toLowerCase().trim();
  if (!needle) return users;
  const { extraText, ...nameOptions } = options;
  return users.filter((user) =>
    displayName(user, nameOptions).toLowerCase().includes(needle) ||
    (user.email || '').toLowerCase().includes(needle) ||
    String(extraText?.(user) ?? '').toLowerCase().includes(needle));
}

/**
 * Inicial exibida no avatar redondo da tabela de usuários.
 * @param {string} name
 */
export function avatarInitial(name) {
  return name.charAt(0).toUpperCase();
}
