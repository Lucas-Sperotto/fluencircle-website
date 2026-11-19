/**
 * @file Seleção VERIFICÁVEL de ambiente (Issue #15).
 *
 * Regra única e sem exceções: página servida por endereço local
 * (localhost, 127.0.0.1, [::1] ou *.localhost) usa o Firebase Emulator com o
 * projeto de demonstração; qualquer outro endereço usa produção.
 *
 * Consequências deliberadas:
 * - `npm run serve`, Live Server ou `npm run emulators` NUNCA tocam dados reais.
 * - Não existe parâmetro de URL para forçar produção a partir de localhost:
 *   testar contra produção exige decisão humana fora do código.
 * - O ambiente de teste mostra um selo na tela (ui/environment-badge.js), que os
 *   testes E2E conferem.
 */
import { PRODUCTION_FIREBASE_CONFIG, EMULATOR_FIREBASE_CONFIG, EMULATOR_HOSTS, EMULATOR_PROJECT_ID } from './firebase.config.js';

export const ENVIRONMENTS = Object.freeze({
  PRODUCTION: 'production',
  EMULATOR: 'emulator',
});

const LOCAL_HOSTNAMES = new Set(['localhost', '127.0.0.1', '::1', '[::1]']);

/**
 * @param {string|undefined|null} hostname valor de `location.hostname`
 * @returns {'production'|'emulator'}
 */
export function resolveEnvironment(hostname) {
  const name = String(hostname ?? '').trim().toLowerCase();
  if (LOCAL_HOSTNAMES.has(name) || name.endsWith('.localhost')) return ENVIRONMENTS.EMULATOR;
  return ENVIRONMENTS.PRODUCTION;
}

/**
 * Configuração de cada ambiente.
 * `badge` é o texto do selo exibido na tela (null em produção).
 */
export const ENVIRONMENT_SETTINGS = Object.freeze({
  [ENVIRONMENTS.PRODUCTION]: Object.freeze({
    name: ENVIRONMENTS.PRODUCTION,
    firebase: PRODUCTION_FIREBASE_CONFIG,
    emulators: null,
    badge: null,
  }),
  [ENVIRONMENTS.EMULATOR]: Object.freeze({
    name: ENVIRONMENTS.EMULATOR,
    firebase: EMULATOR_FIREBASE_CONFIG,
    emulators: EMULATOR_HOSTS,
    badge: `Ambiente de teste local — Firebase Emulator (${EMULATOR_PROJECT_ID}). Dados sintéticos; nada aqui chega à produção.`,
  }),
});

/** Ambiente desta página (calculado uma vez, no carregamento). */
export const CURRENT_ENVIRONMENT = resolveEnvironment(globalThis.location?.hostname);

/** Configuração do ambiente desta página. */
export const currentEnvironment = ENVIRONMENT_SETTINGS[CURRENT_ENVIRONMENT];
