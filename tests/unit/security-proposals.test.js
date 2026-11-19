/**
 * Checagens ESTÁTICAS de arquivos de exemplo; não substituem Emulator,
 * validação de CSP em Hosting preview nem segurança no backend.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const hosting = new URL('../../docs/firebase/firebase.json.exemplo', import.meta.url);

test('exemplo de CSP enumera hosts RTDB legados e regionais', () => {
  const config = JSON.parse(readFileSync(hosting, 'utf8'));
  const csp = config.hosting.headers[0].headers.find(x => x.key === 'Content-Security-Policy').value;
  for (const host of [
    'https://*.firebaseio.com', 'wss://*.firebaseio.com',
    'https://*.firebasedatabase.app', 'wss://*.firebasedatabase.app',
  ]) {
    assert.ok(csp.includes(host), `CSP omite ${host}`);
  }
});

test('rascunho RTDB não permite criação anônima de flashcards', () => {
  const file = new URL('../../docs/firebase/database.rules.proposta.json', import.meta.url);
  const rules = JSON.parse(readFileSync(file, 'utf8')).rules;
  // Este teste verifica SOMENTE a forma do rascunho. Emulator é obrigatório.
  assert.equal(Object.hasOwn(rules.flashcards.$sessionId.$cardId, '.write'), false);
  assert.match(rules.flashcards.$sessionId['.write'], /auth != null/);
});
