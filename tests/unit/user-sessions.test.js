// Índice de presença do aluno (Issue #10): formatos novo e antigo e ordem dos decks.
import test from 'node:test';
import assert from 'node:assert/strict';
import { parseUserSessionIndex, isSessionSummary, sortDecks } from '../../public/js/domain/user-sessions.js';

test('aceita resumo novo e entrada antiga `true`; ignora valores estranhos', () => {
  const entries = parseUserSessionIndex({
    s1: { topic: 'Travel', startedAt: '2026-11-16T19:00:00.000Z' },
    s2: true,
    s3: false,
    s4: { topic: 'Sem data' },
    s5: 'texto',
  });
  assert.deepEqual(entries, [
    { sessionId: 's1', summary: { topic: 'Travel', startedAt: '2026-11-16T19:00:00.000Z' } },
    { sessionId: 's2', summary: null },
  ]);
});

test('índice vazio ou ausente vira lista vazia', () => {
  for (const value of [null, undefined, {}, 'x']) assert.deepEqual(parseUserSessionIndex(value), []);
});

test('isSessionSummary exige tema e início em texto', () => {
  assert.equal(isSessionSummary({ topic: 'a', startedAt: 'b' }), true);
  assert.equal(isSessionSummary({ topic: 'a' }), false);
  assert.equal(isSessionSummary(true), false);
});

test('decks: revisões pendentes primeiro, depois mais recentes; não altera a entrada', () => {
  const decks = [
    { id: 'antigo', startedAt: '2026-11-01T00:00:00Z', srs: { isDue: false } },
    { id: 'novo', startedAt: '2026-11-17T00:00:00Z', srs: { isDue: false } },
    { id: 'pendente', startedAt: '2026-10-01T00:00:00Z', srs: { isDue: true } },
    { id: 'sem-data', srs: { isDue: false } },
  ];
  assert.deepEqual(sortDecks(decks).map((deck) => deck.id), ['pendente', 'novo', 'antigo', 'sem-data']);
  assert.equal(decks[0].id, 'antigo');
});
