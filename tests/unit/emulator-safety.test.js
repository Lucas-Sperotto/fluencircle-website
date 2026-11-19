/**
 * Garantias estáticas de isolamento (Issue #15): o Emulator só usa o projeto
 * de demonstração e endereços locais, nenhum script npm publica nada e a carga
 * sintética recusa alvos remotos.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { assertSafeTarget, PROJECT_ID } from '../../scripts/emulator/seed.mjs';

const read = (file) => JSON.parse(readFileSync(new URL(`../../${file}`, import.meta.url), 'utf8'));

test('firebase.emulator.json: regras propostas, endereços locais e projeto único', () => {
  const config = read('firebase.emulator.json');
  assert.equal(config.database.rules, 'docs/firebase/database.rules.proposta.json');
  assert.equal(config.emulators.singleProjectMode, true);
  for (const [name, emulator] of Object.entries(config.emulators)) {
    if (typeof emulator !== 'object') continue;
    assert.equal(emulator.host, '127.0.0.1', `${name} precisa escutar só localmente`);
  }
  assert.ok(!('functions' in config) && !('firestore' in config), 'nada além de Auth, RTDB e Hosting');
});

test('não existe firebase.json na raiz: `firebase deploy` sem --config não tem o que publicar', () => {
  assert.equal(existsSync(new URL('../../firebase.json', import.meta.url)), false);
});

test('scripts npm: todo comando firebase usa o projeto demo e o arquivo do Emulator; nenhum deploy', () => {
  const { scripts } = read('package.json');
  for (const [name, command] of Object.entries(scripts)) {
    assert.doesNotMatch(command, /\bdeploy\b|hosting:channel/, `${name} não pode publicar`);
    if (/\bfirebase\b/.test(command)) {
      assert.match(command, /--project demo-fluencircle-audit/, `${name} sem projeto demo`);
      assert.match(command, /--config firebase\.emulator\.json/, `${name} sem config do Emulator`);
    }
  }
});

test('carga sintética recusa projeto real e hosts remotos', () => {
  assert.equal(PROJECT_ID, 'demo-fluencircle-audit');
  assert.doesNotThrow(() => assertSafeTarget({ projectId: PROJECT_ID, authHost: '127.0.0.1:9099', databaseHost: 'localhost:9000' }));
  assert.throws(() => assertSafeTarget({ projectId: 'fluentech-1e18a', authHost: '127.0.0.1:9099', databaseHost: '127.0.0.1:9000' }), /demo/);
  assert.throws(() => assertSafeTarget({ projectId: PROJECT_ID, authHost: 'identitytoolkit.googleapis.com:443', databaseHost: '127.0.0.1:9000' }), /local/);
  assert.throws(() => assertSafeTarget({ projectId: PROJECT_ID, authHost: '127.0.0.1:9099', databaseHost: 'fluentech-1e18a-default-rtdb.firebaseio.com:443' }), /local/);
});
