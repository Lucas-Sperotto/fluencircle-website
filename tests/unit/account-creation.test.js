// Criação de conta com compensação (Issue #8), com etapas simuladas.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createAccountWithRollback, AccountCreationError } from '../../public/js/services/account-creation.js';

function steps({ profileFails = false, deleteFails = false, createFails = false } = {}) {
  const calls = [];
  return {
    calls,
    createAuthUser: async () => { calls.push('create'); if (createFails) throw Object.assign(new Error('em uso'), { code: 'auth/email-already-in-use' }); return { uid: 'novo-uid' }; },
    writeProfile: async (uid) => { calls.push(`profile:${uid}`); if (profileFails) throw new Error('PERMISSION_DENIED'); },
    deleteAuthUser: async (user) => { calls.push(`delete:${user.uid}`); if (deleteFails) throw new Error('requires-recent-login'); },
    signOutSecondary: async () => { calls.push('signout'); },
  };
}

test('sucesso: cria conta, grava perfil e sai da instância auxiliar', async () => {
  const s = steps();
  assert.equal(await createAccountWithRollback(s), 'novo-uid');
  assert.deepEqual(s.calls, ['create', 'profile:novo-uid', 'signout']);
});

test('perfil falha: desfaz a conta de login e informa que desfez', async () => {
  const s = steps({ profileFails: true });
  await assert.rejects(createAccountWithRollback(s), (error) => error instanceof AccountCreationError
    && error.code === 'profile-write-failed' && error.rolledBack === true && error.orphanUid === null
    && /PERMISSION_DENIED/.test(error.cause.message));
  assert.deepEqual(s.calls, ['create', 'profile:novo-uid', 'delete:novo-uid', 'signout']);
});

test('perfil e desfazer falham: informa o uid órfão para o operador', async (t) => {
  t.mock.method(console, 'error', () => {});
  const s = steps({ profileFails: true, deleteFails: true });
  await assert.rejects(createAccountWithRollback(s), (error) => error.rolledBack === false && error.orphanUid === 'novo-uid');
});

test('erro do Auth (ex.: e-mail em uso) não tenta gravar perfil nem desfazer', async () => {
  const s = steps({ createFails: true });
  await assert.rejects(createAccountWithRollback(s), (error) => error.code === 'auth/email-already-in-use');
  assert.deepEqual(s.calls, ['create']);
});
