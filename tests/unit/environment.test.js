// Seleção de ambiente (Issue #15): endereço local → Emulator; o resto → produção.
import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveEnvironment, ENVIRONMENTS, ENVIRONMENT_SETTINGS } from '../../public/js/config/environment.js';

test('endereços locais selecionam o Emulator', () => {
  for (const host of ['localhost', '127.0.0.1', '::1', '[::1]', 'LOCALHOST', 'app.localhost']) {
    assert.equal(resolveEnvironment(host), ENVIRONMENTS.EMULATOR, host);
  }
});

test('qualquer outro endereço seleciona produção (inclusive vazio e IP de rede local)', () => {
  for (const host of ['fluentech-1e18a.web.app', 'fluentech-1e18a.firebaseapp.com', '192.168.0.10', '', undefined, null, 'localhost.evil.example']) {
    assert.equal(resolveEnvironment(host), ENVIRONMENTS.PRODUCTION, String(host));
  }
});

test('configuração do Emulator não contém nenhum identificador do projeto real', () => {
  const emulator = JSON.stringify(ENVIRONMENT_SETTINGS.emulator.firebase);
  assert.match(ENVIRONMENT_SETTINGS.emulator.firebase.projectId, /^demo-/);
  assert.doesNotMatch(emulator, /fluentech|AIza/);
  assert.equal(ENVIRONMENT_SETTINGS.emulator.emulators.databaseHost, '127.0.0.1');
  assert.match(ENVIRONMENT_SETTINGS.emulator.badge, /Emulator/);
});

test('produção não liga Emulator nem mostra selo', () => {
  assert.equal(ENVIRONMENT_SETTINGS.production.emulators, null);
  assert.equal(ENVIRONMENT_SETTINGS.production.badge, null);
  assert.equal(ENVIRONMENT_SETTINGS.production.firebase.projectId, 'fluentech-1e18a');
});
