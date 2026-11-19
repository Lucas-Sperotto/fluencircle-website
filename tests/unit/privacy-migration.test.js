// Plano de migração de privacidade (offline; nunca conecta ao Firebase).
import test from 'node:test';
import assert from 'node:assert/strict';
import { planPrivacyMigration } from '../../scripts/migrations/privacy-migration.mjs';
import { ACTORS, SESSIONS, buildSyntheticDatabase } from '../fixtures/synthetic-data.mjs';

test('remove PII da presença antiga e atualiza o índice antigo da carga sintética', () => {
  const { updates, stats, orphans } = planPrivacyMigration(buildSyntheticDatabase());
  const bruno = ACTORS.studentB.uid;
  assert.deepEqual(updates, {
    [`meeting_sessions/${SESSIONS.both}/attendees/${bruno}/name`]: null,
    [`meeting_sessions/${SESSIONS.both}/attendees/${bruno}/email`]: null,
    [`user_sessions/${bruno}/${SESSIONS.both}`]: { topic: 'Travel', startedAt: '2026-11-16T19:00:00.000Z' },
  });
  assert.equal(stats.piiRemoved, 1);
  assert.equal(stats.indexUpgraded, 1);
  assert.deepEqual(orphans, []);
});

test('cria índice faltante, preenche addedAt ausente e só relata órfãos', () => {
  const data = {
    meeting_sessions: { s1: { topic: 'T', startedAt: '2026-01-01T00:00:00.000Z', attendees: { u1: { name: 'N', email: 'n@example.test' } } } },
    user_sessions: { u2: { s1: true }, u3: { sumiu: { topic: 'X', startedAt: '2026-01-01T00:00:00.000Z' } } },
  };
  const { updates, stats, orphans } = planPrivacyMigration(data);
  assert.equal(updates['meeting_sessions/s1/attendees/u1/addedAt'], '2026-01-01T00:00:00.000Z');
  assert.deepEqual(updates['user_sessions/u1/s1'], { topic: 'T', startedAt: '2026-01-01T00:00:00.000Z' });
  assert.equal(stats.addedAtFilled, 1);
  assert.deepEqual(orphans.sort(), ['user_sessions/u2/s1', 'user_sessions/u3/sumiu']);
  assert.ok(!Object.keys(updates).some((path) => path.startsWith('user_sessions/u2') || path.startsWith('user_sessions/u3')), 'órfãos não são apagados');
});

test('banco vazio gera plano vazio', () => {
  assert.deepEqual(planPrivacyMigration({}).updates, {});
  assert.deepEqual(planPrivacyMigration(null).updates, {});
});
