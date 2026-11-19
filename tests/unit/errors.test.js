// Classificação de erros do Firebase.
import test from 'node:test';
import assert from 'node:assert/strict';
import { isPermissionDenied } from '../../public/js/domain/errors.js';

test('reconhece negação por regra no código ou na mensagem', () => {
  assert.equal(isPermissionDenied({ code: 'PERMISSION_DENIED' }), true);
  assert.equal(isPermissionDenied(new Error('PERMISSION_DENIED: Permission denied')), true);
  assert.equal(isPermissionDenied({ message: 'permission_denied at /flashcards/x' }), true);
});

test('outros erros e valores não são negação de regra', () => {
  for (const value of [new Error('network error'), { code: 'unavailable' }, null, undefined, 'PERMISSION_DENIED']) {
    assert.equal(isPermissionDenied(value), false);
  }
});
