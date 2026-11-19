/**
 * @file Executa os testes de regras (tests/rules/*.test.mjs) com o executor escolhido.
 *
 *   node scripts/test-rules.mjs --driver=simulator   # offline, pré-verificação
 *   node scripts/test-rules.mjs --driver=emulator    # dentro de `firebase emulators:exec`
 *
 * Com `--driver=emulator`, recusa rodar se o Emulator não for local: os testes
 * apagam e regravam o banco, então nunca podem apontar para um servidor real.
 */
import { spawnSync } from 'node:child_process';

const driverArg = process.argv.find((arg) => arg.startsWith('--driver='));
const driver = driverArg ? driverArg.split('=')[1] : 'simulator';
if (!['simulator', 'emulator'].includes(driver)) {
  console.error(`Executor desconhecido: ${driver}. Use --driver=simulator ou --driver=emulator.`);
  process.exit(2);
}

if (driver === 'emulator') {
  const host = process.env.FIREBASE_DATABASE_EMULATOR_HOST || '';
  if (!/^(127\.0\.0\.1|localhost|\[::1\]):\d+$/.test(host)) {
    console.error('FIREBASE_DATABASE_EMULATOR_HOST ausente ou não local. Rode via `npm run test:rules`, '
      + 'que sobe o Emulator com `firebase emulators:exec`. Nada foi executado.');
    process.exit(2);
  }
  console.log(`Executor: Firebase Emulator em ${host} (projeto demo-fluencircle-audit).`);
} else {
  console.log('Executor: SIMULADOR local (pré-verificação; não substitui o Firebase Emulator).');
}

// Vários arquivos de teste compartilham UMA instância do Firebase Emulator
// e cada beforeEach limpa/carrega o banco. Rodá-los em paralelo faz uma suíte
// apagar os dados da outra (falhas espúrias de transação e autorização).
// No simulador, cada arquivo cria seu próprio banco e pode ser paralelo.
const runnerArgs = ['--test', ...(driver === 'emulator' ? ['--test-concurrency=1'] : []),
  'tests/rules/*.test.mjs'];
const result = spawnSync(process.execPath, runnerArgs, {
  stdio: 'inherit',
  env: { ...process.env, RULES_DRIVER: driver },
});
process.exit(result.status ?? 1);
