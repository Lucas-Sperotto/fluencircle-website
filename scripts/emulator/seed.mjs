/**
 * @file Carrega dados SINTÉTICOS no Firebase Emulator local (Auth + Realtime Database).
 *
 *   npm run emulators        # terminal 1: sobe Auth, RTDB, Hosting e UI locais
 *   npm run emulators:seed   # terminal 2: cria as contas e o banco de demonstração
 *
 * Segurança: recusa qualquer alvo que não seja 127.0.0.1/localhost e projeto
 * `demo-*`. O token "owner" só existe no Emulator (ignora regras para semear).
 * Os dados vêm de tests/fixtures/synthetic-data.mjs (nada real).
 */
import { ACTORS, DEMO_PASSWORD, buildSyntheticDatabase } from '../../tests/fixtures/synthetic-data.mjs';

export const PROJECT_ID = 'demo-fluencircle-audit';
export const DATABASE_NAMESPACE = `${PROJECT_ID}-default-rtdb`;
const LOCAL_HOST = /^(127\.0\.0\.1|localhost|\[::1\]):\d{2,5}$/;

/**
 * Garante que a carga só atinja o Emulator local de um projeto de demonstração.
 * @throws {Error} quando o alvo não é seguro
 */
export function assertSafeTarget({ projectId, authHost, databaseHost }) {
  if (!/^demo-[a-z0-9-]+$/.test(projectId)) throw new Error(`Projeto "${projectId}" não é demo-*: carga recusada.`);
  for (const [name, host] of [['Auth', authHost], ['Realtime Database', databaseHost]]) {
    if (!LOCAL_HOST.test(host)) throw new Error(`${name} Emulator "${host}" não é local: carga recusada.`);
  }
}

async function request(url, options) {
  const response = await fetch(url, options);
  const body = await response.text();
  if (!response.ok) throw new Error(`${options.method} ${url} → ${response.status}: ${body.slice(0, 200)}`);
  return body ? JSON.parse(body) : null;
}

async function main() {
  const target = {
    projectId: PROJECT_ID,
    authHost: process.env.FIREBASE_AUTH_EMULATOR_HOST || '127.0.0.1:9099',
    databaseHost: process.env.FIREBASE_DATABASE_EMULATOR_HOST || '127.0.0.1:9000',
  };
  assertSafeTarget(target);

  // 1. Zera as contas do Auth Emulator (endpoint exclusivo do Emulator).
  await request(`http://${target.authHost}/emulator/v1/projects/${PROJECT_ID}/accounts`, { method: 'DELETE' });

  // 2. Cria uma conta por ator; o Emulator devolve o uid gerado.
  const uids = {};
  for (const [key, actor] of Object.entries(ACTORS)) {
    const created = await request(`http://${target.authHost}/identitytoolkit.googleapis.com/v1/accounts:signUp?key=demo-fluencircle-key`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: actor.email, password: DEMO_PASSWORD, returnSecureToken: true }),
    });
    uids[key] = created.localId;
  }

  // 3. Substitui o banco inteiro pela carga sintética, com os uids reais do Auth Emulator.
  await request(`http://${target.databaseHost}/.json?ns=${DATABASE_NAMESPACE}`, {
    method: 'PUT',
    headers: { Authorization: 'Bearer owner', 'Content-Type': 'application/json' },
    body: JSON.stringify(buildSyntheticDatabase({ uids })),
  });

  console.log(`Emulator carregado (projeto ${PROJECT_ID}). Senha de todas as contas: ${DEMO_PASSWORD}`);
  console.table(Object.entries(ACTORS).map(([key, actor]) => ({ papel: actor.role || '(sem perfil ou revogada)', ator: key, email: actor.email })));
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error(`Falha ao carregar o Emulator: ${error.message}`);
    console.error('O Emulator está rodando? Use `npm run emulators` em outro terminal.');
    process.exitCode = 1;
  });
}
