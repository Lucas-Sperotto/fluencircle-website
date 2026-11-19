import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildAddAttendeeUpdates, buildRemoveAttendeeUpdates, buildDeleteSessionUpdates,
} from '../../public/js/services/session-updates.js';

test('presença: data na sessão e resumo no índice do aluno, numa mesma escrita e sem PII', () => {
  const updates = buildAddAttendeeUpdates('sess-A', 'uid-1', { topic: 'Travel', startedAt: '2026-11-18T11:00:00Z' }, '2026-11-18T12:00:00Z');
  assert.deepEqual(updates, {
    'meeting_sessions/sess-A/attendees/uid-1': { addedAt: '2026-11-18T12:00:00Z' },
    'user_sessions/uid-1/sess-A': { topic: 'Travel', startedAt: '2026-11-18T11:00:00Z' },
  });
  assert.doesNotMatch(JSON.stringify(updates), /@|name|email/);
});
test('presença exige o resumo da sessão para o índice', () => {
  assert.throws(() => buildAddAttendeeUpdates('sess-A', 'uid-1', { topic: 'Travel' }, '2026-11-18T12:00:00Z'), TypeError);
});
test('remoção de presença: ambos os caminhos usam null em uma operação', () => {
  assert.deepEqual(buildRemoveAttendeeUpdates('sess-A', 'uid-1'), {
    'meeting_sessions/sess-A/attendees/uid-1': null,
    'user_sessions/uid-1/sess-A': null,
  });
});
test('exclusão sem presentes remove sessão e cards', () => {
  assert.deepEqual(buildDeleteSessionUpdates('sess-A'), { 'meeting_sessions/sess-A': null, 'flashcards/sess-A': null });
});
test('exclusão com presentes remove índices e não muta a entrada', () => {
  const uids = ['uid-1', 'uid-2'];
  assert.deepEqual(buildDeleteSessionUpdates('sess-A', uids), {
    'meeting_sessions/sess-A': null,
    'flashcards/sess-A': null,
    'user_sessions/uid-1/sess-A': null,
    'user_sessions/uid-2/sess-A': null,
  });
  assert.deepEqual(uids, ['uid-1', 'uid-2']);
});
test('uids repetidos não criam chaves duplicadas', () => {
  assert.equal(Object.keys(buildDeleteSessionUpdates('s', ['u', 'u'])).length, 3);
});
test('não aceita ids vazios, caminho absoluto ou caracteres especiais RTDB', () => {
  for (const id of ['', 'a/b', 'a.b', 'a#b', '$root', 'x[1]', 'x\u0001y', null, 10]) {
    assert.throws(() => buildRemoveAttendeeUpdates(id, 'uid'), TypeError);
    assert.throws(() => buildDeleteSessionUpdates('sess', [id]), TypeError);
  }
  assert.throws(() => buildDeleteSessionUpdates('sess', 'uid'), TypeError);
});
