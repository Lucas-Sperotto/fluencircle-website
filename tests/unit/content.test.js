// Testes de perguntas, formatação e prompt de tradução (public/js/domain/).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { toQuestionList } from '../../public/js/domain/questions.js';
import { formatDate, formatDateTime, truncate } from '../../public/js/domain/format.js';
import { buildTranslationPrompt } from '../../public/js/domain/translation.js';

test('toQuestionList aceita array, objeto e valores vazios', () => {
  assert.deepEqual(toQuestionList(['a', 'b']), ['a', 'b']);
  assert.deepEqual(toQuestionList({ 0: 'a', 1: 'b' }), ['a', 'b']);
  assert.deepEqual(toQuestionList(['a', null, 'b']), ['a', 'b']);
  assert.deepEqual(toQuestionList(undefined), []);
  assert.deepEqual(toQuestionList('texto'), []);
});

test('formatDate e formatDateTime no padrão brasileiro', () => {
  assert.equal(formatDate('2026-09-21T12:00:00.000Z'), '21/09/2026');
  assert.equal(formatDate(undefined), '');
  assert.match(formatDateTime('2026-09-21T12:00:00.000Z'), /^21\/09\/2026,? \d{2}:\d{2}$/);
  assert.equal(formatDateTime(''), 'Data não informada');
});

test('truncate corta e acrescenta reticências', () => {
  assert.equal(truncate('abcdef', 3), 'abc...');
  assert.equal(truncate('abc', 3), 'abc');
});

test('prompt de tradução: versão única, termina com o texto do usuário', () => {
  const prompt = buildTranslationPrompt('annoying');
  assert.ok(prompt.endsWith('Texto a ser traduzido: annoying'));
  assert.ok(prompt.includes('7. NUNCA retorne o mesmo idioma da entrada.'));
  assert.ok(!prompt.includes('bidirecional bidirecional'));
});
