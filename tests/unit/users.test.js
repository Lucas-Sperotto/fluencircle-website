// Testes de exibição, ordenação e busca de usuários (public/js/domain/users.js).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { displayName, sortUsersByName, filterUsers, avatarInitial } from '../../public/js/domain/users.js';

const users = [
  { uid: 'b', firstName: 'Bruno', lastName: 'Lima', email: 'bruno@x.com' },
  { uid: 'z', email: 'zeca@x.com' },
  { uid: 'a', firstName: 'Álvaro', lastName: 'Souza', email: 'alvaro@x.com' },
  { uid: 'n' },
];

test('displayName: nome completo, e-mail ou texto padrão', () => {
  assert.equal(displayName(users[0]), 'Bruno Lima');
  assert.equal(displayName(users[1]), 'zeca');
  assert.equal(displayName(users[1], { emailMode: 'full' }), 'zeca@x.com');
  assert.equal(displayName(users[3]), 'Usuário Sem Nome');
  assert.equal(displayName(users[3], { fallback: 'Aluno' }), 'Aluno');
  assert.equal(displayName({ firstName: 'Ana', email: 'ana@x.com' }), 'ana', 'sem sobrenome usa o e-mail');
});

test('sortUsersByName: ordem alfabética do português, sem alterar a lista original', () => {
  const sorted = sortUsersByName(users).map((u) => u.uid);
  assert.deepEqual(sorted, ['n', 'a', 'b', 'z']);
  assert.deepEqual(users.map((u) => u.uid), ['b', 'z', 'a', 'n']);
});

test('filterUsers: busca no nome exibido e no e-mail, sem diferenciar maiúsculas', () => {
  assert.deepEqual(filterUsers(users, 'LIMA').map((u) => u.uid), ['b']);
  assert.deepEqual(filterUsers(users, ' x.com ').map((u) => u.uid), ['b', 'z', 'a']);
  assert.deepEqual(filterUsers(users, 'usuário').map((u) => u.uid), ['n']);
  assert.equal(filterUsers(users, '').length, users.length);
});

test('avatarInitial: primeira letra em maiúscula', () => {
  assert.equal(avatarInitial('zeca'), 'Z');
});
