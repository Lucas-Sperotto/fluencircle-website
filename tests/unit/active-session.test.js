import test from 'node:test';
import assert from 'node:assert/strict';
import { canSaveTranslationToSession } from '../../public/js/domain/active-session.js';

test('aceita tradução que retorna à mesma sessão', () => {
  assert.equal(canSaveTranslationToSession({ sessionId: 's1' }, { sessionId: 's1', topic: 'Outro título' }), true);
});
test('rejeita tradução quando a sessão foi substituída durante a resposta', () => {
  assert.equal(canSaveTranslationToSession({ sessionId: 's1' }, { sessionId: 's2' }), false);
});
test('rejeita ao encerrar a sessão ou quando não havia sessão', () => {
  assert.equal(canSaveTranslationToSession({ sessionId: 's1' }, null), false);
  assert.equal(canSaveTranslationToSession(null, { sessionId: 's1' }), false);
  assert.equal(canSaveTranslationToSession({ sessionId: '' }, { sessionId: '' }), false);
});
