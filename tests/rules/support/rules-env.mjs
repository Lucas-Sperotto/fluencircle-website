/**
 * @file Ambiente dos testes de regras com dois executores ("drivers"):
 *
 * - `emulator`: `@firebase/rules-unit-testing` + Firebase Emulator. É a PROVA
 *   OFICIAL. Use `npm run test:rules` (sobe o Emulator com `emulators:exec`).
 * - `simulator`: `tests/support/rtdb-rules-simulator.js`, avaliador local sem
 *   rede. É só PRÉ-VERIFICAÇÃO: `npm run test:rules:sim`.
 *
 * Escolha: variável RULES_DRIVER=emulator|simulator. Sem ela, usa o Emulator
 * quando FIREBASE_DATABASE_EMULATOR_HOST existe (o `emulators:exec` define).
 * O nome do executor aparece no título de cada suíte, para que um relatório
 * nunca confunda simulação com Emulator.
 *
 * Os testes falam com uma API mínima (get/set/update/remove/transaction/
 * onDisconnect), igual nos dois executores.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
import { createRulesSimulator } from '../../support/rtdb-rules-simulator.js';

export const PROJECT_ID = 'demo-fluencircle-audit';
export const RULES_PATH = fileURLToPath(new URL('../../../docs/firebase/database.rules.proposta.json', import.meta.url));

/** @returns {'emulator'|'simulator'} */
export function selectedDriver() {
  const explicit = process.env.RULES_DRIVER;
  if (explicit === 'emulator' || explicit === 'simulator') return explicit;
  if (explicit) throw new Error(`RULES_DRIVER inválido: ${explicit}`);
  return process.env.FIREBASE_DATABASE_EMULATOR_HOST ? 'emulator' : 'simulator';
}

const isPermissionDenied = (error) => /permission[_ -]?denied/i.test(`${error?.code ?? ''} ${error?.message ?? ''}`);

/**
 * @typedef {{ uid: string, email?: string } | null} Actor  null = visitante sem login
 * @typedef {Object} Client
 * @property {(path: string) => Promise<unknown>} get
 * @property {(path: string, value: unknown) => Promise<void>} set
 * @property {(path: string, values: object) => Promise<void>} update
 * @property {(path: string) => Promise<void>} remove
 * @property {(path: string, fn: (current: any) => any) => Promise<{ committed: boolean, value: unknown }>} transaction
 * @property {(path: string) => Promise<void>} onDisconnectRemove
 * @property {(path: string) => Promise<void>} onDisconnectCancel
 * @property {() => Promise<void>} goOffline simula queda da conexão desta "aba"
 * @property {() => Promise<void>} goOnline
 */

/** Cria o ambiente do executor escolhido. */
export async function createRulesEnv() {
  const driver = selectedDriver();
  const rulesText = readFileSync(RULES_PATH, 'utf8');
  const env = driver === 'emulator' ? await emulatorEnv(rulesText) : simulatorEnv(rulesText);
  return {
    ...env,
    driver,
    label: driver === 'emulator' ? '[Emulator]' : '[SIMULADOR local — não é o Emulator]',
    /** Espera a promessa ser NEGADA por regra (outro erro reprova o teste). */
    async denied(promise) {
      try {
        await promise;
      } catch (error) {
        if (isPermissionDenied(error)) {
          // RULES_DEBUG=1 mostra o motivo da negação (útil para revisar regras).
          if (process.env.RULES_DEBUG) console.log(`  ↳ negado: ${error.message}`);
          return;
        }
        throw error;
      }
      assert.fail('Era esperado PERMISSION_DENIED, mas a operação foi permitida.');
    },
    /** Espera a promessa ser PERMITIDA; mostra o motivo se a regra negar. */
    async allowed(promise) {
      try {
        return await promise;
      } catch (error) {
        assert.fail(`Era esperado sucesso, mas: ${error?.message || error}`);
      }
    },
    /** Repete a leitura administrativa até `predicate` valer (desconexões são assíncronas). */
    async waitForAdmin(path, predicate, timeoutMs = 8000) {
      const deadline = Date.now() + timeoutMs;
      let value;
      do {
        value = await env.adminGet(path);
        if (predicate(value)) return value;
        await new Promise((resolve) => setTimeout(resolve, 100));
      } while (Date.now() < deadline);
      assert.fail(`Tempo esgotado esperando ${path}; último valor: ${JSON.stringify(value)}`);
    },
  };
}

function simulatorEnv(rulesText) {
  const simulator = createRulesSimulator({ rules: JSON.parse(rulesText) });
  let connections = 0;
  const run = async (fn) => fn();
  return {
    async seed(data) { simulator.reset(data); },
    async reset() { simulator.reset(null); },
    async adminGet(path) { return simulator.adminGet(path); },
    async cleanup() {},
    /** @param {Actor} actor @returns {Client} */
    as(actor) {
      const connection = `conexao-${++connections}`;
      const auth = actor ? { uid: actor.uid, token: { email: actor.email ?? null, email_verified: true } } : null;
      return {
        get: (path) => run(() => simulator.read(path, auth)),
        set: (path, value) => run(() => simulator.set(path, value, auth)),
        update: (path, values) => run(() => simulator.update(path, values, auth)),
        remove: (path) => run(() => simulator.remove(path, auth)),
        transaction: (path, fn) => run(() => simulator.transaction(path, fn, auth)),
        onDisconnectRemove: (path) => run(() => simulator.onDisconnect(connection, { op: 'remove', path }, auth)),
        onDisconnectCancel: (path) => run(() => simulator.cancelOnDisconnect(connection, path)),
        goOffline: () => run(() => { simulator.disconnect(connection); }),
        goOnline: () => run(() => {}),
      };
    },
  };
}

async function emulatorEnv(rulesText) {
  let testing;
  try {
    testing = await import('@firebase/rules-unit-testing');
  } catch (error) {
    throw new Error('Driver "emulator" exige `npm install` (devDependencies @firebase/rules-unit-testing e firebase). '
      + `Erro original: ${error.message}`);
  }
  const testEnv = await testing.initializeTestEnvironment({
    projectId: PROJECT_ID,
    // host/porta vêm de FIREBASE_DATABASE_EMULATOR_HOST (definida por `emulators:exec`).
    database: { rules: rulesText },
  });
  const adminDb = async (fn) => {
    let result;
    await testEnv.withSecurityRulesDisabled(async (context) => { result = await fn(context.database()); });
    return result;
  };
  return {
    async seed(data) {
      await testEnv.clearDatabase();
      if (data) await adminDb((db) => db.ref().set(data));
    },
    async reset() { await testEnv.clearDatabase(); },
    async adminGet(path) { return adminDb(async (db) => (await db.ref(path).once('value')).val()); },
    async cleanup() { await testEnv.cleanup(); },
    /** @param {Actor} actor @returns {Client} */
    as(actor) {
      const context = actor
        ? testEnv.authenticatedContext(actor.uid, { email: actor.email ?? undefined, email_verified: true })
        : testEnv.unauthenticatedContext();
      const db = context.database();
      return {
        get: async (path) => (await db.ref(path).once('value')).val(),
        set: (path, value) => db.ref(path).set(value),
        update: (path, values) => db.ref(path).update(values),
        remove: (path) => db.ref(path).remove(),
        transaction: async (path, fn) => {
          const result = await db.ref(path).transaction(fn);
          return { committed: result.committed, value: result.snapshot.val() };
        },
        onDisconnectRemove: (path) => db.ref(path).onDisconnect().remove(),
        onDisconnectCancel: (path) => db.ref(path).onDisconnect().cancel(),
        goOffline: async () => { db.goOffline(); },
        goOnline: async () => { db.goOnline(); },
      };
    },
  };
}
