/**
 * Privacidade e leitura mínima (Issue #10): o aluno lê só o próprio índice e os
 * decks das sessões de que participou; nunca a coleção de sessões, as presenças
 * de outras pessoas ou os cards de sessões alheias. Novas presenças não gravam
 * nome nem e-mail. Dados antigos (presença com nome/e-mail, índice `true`)
 * continuam funcionando.
 *
 * Executar: `npm run test:rules` (Emulator) ou `npm run test:rules:sim`.
 */
import { describe, test, beforeEach, after } from 'node:test';
import assert from 'node:assert/strict';
import { createRulesEnv } from './support/rules-env.mjs';
import { ACTORS, SESSIONS, buildSyntheticDatabase } from '../fixtures/synthetic-data.mjs';

const env = await createRulesEnv();
const { studentA, studentB, mediatorA, admin, noProfile, revoked } = ACTORS;
const NOW = '2026-11-19T12:00:00.000Z';

describe(`${env.label} privacidade: leitura por presença e PII mínima`, () => {
  beforeEach(() => env.seed(buildSyntheticDatabase()));
  after(() => env.cleanup());

  test('aluna lê o próprio índice, com o resumo das sessões', async () => {
    const index = await env.allowed(env.as(studentA).get(`user_sessions/${studentA.uid}`));
    assert.deepEqual(Object.keys(index).sort(), [SESSIONS.both, SESSIONS.anaOnly].sort());
    assert.equal(index[SESSIONS.anaOnly].topic, 'Technology & Daily Life');
  });

  test('aluna lê os decks das próprias sessões e não os de sessão alheia', async () => {
    const ana = env.as(studentA);
    await env.allowed(ana.get(`flashcards/${SESSIONS.anaOnly}`));
    await env.allowed(ana.get(`flashcards/${SESSIONS.both}`));
    await env.denied(ana.get(`flashcards/${SESSIONS.brunoOnly}`));
    await env.denied(ana.get('flashcards'));
  });

  test('aluno não lê a coleção de sessões, uma sessão inteira nem a lista de presença', async () => {
    const ana = env.as(studentA);
    await env.denied(ana.get('meeting_sessions'));
    await env.denied(ana.get(`meeting_sessions/${SESSIONS.both}`));
    await env.denied(ana.get(`meeting_sessions/${SESSIONS.both}/attendees`));
    await env.denied(ana.get(`meeting_sessions/${SESSIONS.both}/attendees/${studentB.uid}`));
    await env.denied(ana.get(`meeting_sessions/${SESSIONS.both}/mediatorEmail`));
  });

  test('participante lê só tema e início da própria sessão (entradas antigas do índice)', async () => {
    const bruno = env.as(studentB);
    assert.equal(await env.allowed(bruno.get(`meeting_sessions/${SESSIONS.both}/topic`)), 'Travel');
    assert.equal(await env.allowed(bruno.get(`meeting_sessions/${SESSIONS.both}/startedAt`)), '2026-11-16T19:00:00.000Z');
    await env.denied(bruno.get(`meeting_sessions/${SESSIONS.anaOnly}/topic`));
  });

  test('índice antigo (`true`) e presença antiga continuam dando acesso ao deck', async () => {
    const index = await env.adminGet(`user_sessions/${studentB.uid}`);
    assert.equal(index[SESSIONS.both], true, 'fixture mantém formato antigo');
    await env.allowed(env.as(studentB).get(`flashcards/${SESSIONS.both}`));
  });

  test('presença registrada só em attendees (sem índice) também libera o deck', async () => {
    await env.seed({ ...buildSyntheticDatabase(), user_sessions: null });
    await env.allowed(env.as(studentA).get(`flashcards/${SESSIONS.anaOnly}`));
  });

  test('conta sem perfil ou revogada não lê decks mesmo com índice antigo deixado para trás', async () => {
    const data = buildSyntheticDatabase();
    data.user_sessions[noProfile.uid] = { [SESSIONS.anaOnly]: true };
    data.user_sessions[revoked.uid] = { [SESSIONS.anaOnly]: true };
    await env.seed(data);
    await env.denied(env.as(noProfile).get(`flashcards/${SESSIONS.anaOnly}`));
    await env.denied(env.as(revoked).get(`flashcards/${SESSIONS.anaOnly}`));
    await env.denied(env.as(revoked).get(`meeting_sessions/${SESSIONS.anaOnly}/topic`));
  });

  test('visitante não lê índice, sessões nem decks', async () => {
    const visitor = env.as(null);
    await env.denied(visitor.get(`user_sessions/${studentA.uid}`));
    await env.denied(visitor.get(`meeting_sessions/${SESSIONS.anaOnly}/topic`));
    await env.denied(visitor.get(`flashcards/${SESSIONS.anaOnly}`));
  });

  test('equipe continua lendo sessões e cards para gestão', async () => {
    await env.allowed(env.as(mediatorA).get('meeting_sessions'));
    await env.allowed(env.as(mediatorA).get('flashcards'));
    await env.allowed(env.as(admin).get(`meeting_sessions/${SESSIONS.both}/attendees`));
  });

  test('nova presença não grava nome nem e-mail', async () => {
    const indexEntry = { topic: 'Technology & Daily Life', startedAt: '2026-11-10T19:00:00.000Z' };
    const carla = env.as(mediatorA);
    await env.denied(carla.update('/', {
      [`meeting_sessions/${SESSIONS.anaOnly}/attendees/${studentB.uid}`]: { addedAt: NOW, name: 'Bruno Aluno', email: studentB.email },
      [`user_sessions/${studentB.uid}/${SESSIONS.anaOnly}`]: indexEntry,
    }));
    await env.allowed(carla.update('/', {
      [`meeting_sessions/${SESSIONS.anaOnly}/attendees/${studentB.uid}`]: { addedAt: NOW },
      [`user_sessions/${studentB.uid}/${SESSIONS.anaOnly}`]: indexEntry,
    }));
  });

  test('índice novo exige resumo válido; formato antigo `true` não é mais gravado', async () => {
    const carla = env.as(mediatorA);
    const attendeePath = `meeting_sessions/${SESSIONS.anaOnly}/attendees/${studentB.uid}`;
    const indexPath = `user_sessions/${studentB.uid}/${SESSIONS.anaOnly}`;
    await env.denied(carla.update('/', { [attendeePath]: { addedAt: NOW }, [indexPath]: true }));
    await env.denied(carla.update('/', { [attendeePath]: { addedAt: NOW }, [indexPath]: { topic: 'Sem data' } }));
    await env.denied(carla.update('/', { [attendeePath]: { addedAt: NOW }, [indexPath]: { topic: 'X', startedAt: NOW, email: studentB.email } }));
  });

  test('remover PII de presença antiga é permitido (base da migração)', async () => {
    await env.allowed(env.as(admin).update(`meeting_sessions/${SESSIONS.both}/attendees/${studentB.uid}`, { name: null, email: null }));
    assert.deepEqual(await env.adminGet(`meeting_sessions/${SESSIONS.both}/attendees/${studentB.uid}`), { addedAt: '2026-11-16T19:06:00.000Z' });
  });
});
