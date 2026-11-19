/**
 * E2E — leitura mínima do aluno (Issue #10): a tela de flashcards parte do
 * índice próprio e não lê coleções inteiras nem presenças de outras pessoas.
 * O registro de operações do banco simulado mostra exatamente o que foi lido.
 */
import { describe, test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createFakeBackend, launchBrowser, newContext, openPage, unexpectedErrors } from './support/harness.mjs';
import { ACTORS, SESSIONS } from '../fixtures/synthetic-data.mjs';

const deckTopics = async (page) => {
  await page.locator('#sessions-grid .srs-meeting-card, #sessions-grid .empty-state').first().waitFor();
  return (await page.locator('#sessions-grid .srs-card-topic').allTextContents()).sort();
};
const readsBy = (backend, uid) => backend.log.filter((entry) => entry.uid === uid && ['db.get', 'db.subscribe'].includes(entry.op)).map((entry) => entry.path);

describe('E2E [Firebase simulado] privacidade: leitura mínima do aluno', () => {
  let browser;
  before(async () => { browser = await launchBrowser(); });
  after(async () => { await browser?.close(); });

  test('aluna lê só o próprio índice, os próprios decks e o próprio progresso', async () => {
    const backend = createFakeBackend();
    const ctx = await newContext(browser, backend);
    const { page, errors } = await openPage(ctx, 'flash-cards.html', { as: ACTORS.studentA });
    assert.deepEqual(await deckTopics(page), ['Technology & Daily Life', 'Travel']);
    const uid = ACTORS.studentA.uid;
    const allowed = new Set([
      `users/${uid}`, `deleted_users/${uid}`, `user_sessions/${uid}`, `student_reviews/${uid}`,
      `flashcards/${SESSIONS.anaOnly}`, `flashcards/${SESSIONS.both}`,
    ]);
    const reads = readsBy(backend, uid);
    assert.ok(reads.length > 0);
    assert.deepEqual(reads.filter((path) => !allowed.has(path)), [], `leituras fora do mínimo: ${reads.join(', ')}`);
    assert.deepEqual(unexpectedErrors(errors), []);
    await ctx.context.close();
  });

  test('entrada antiga do índice (`true`) usa só tema e início da própria sessão', async () => {
    const backend = createFakeBackend();
    const ctx = await newContext(browser, backend);
    const { page, errors } = await openPage(ctx, 'flash-cards.html', { as: ACTORS.studentB });
    assert.deepEqual(await deckTopics(page), ['Travel', 'Travel II']);
    const reads = readsBy(backend, ACTORS.studentB.uid);
    assert.ok(reads.includes(`meeting_sessions/${SESSIONS.both}/topic`));
    assert.ok(reads.includes(`meeting_sessions/${SESSIONS.both}/startedAt`));
    assert.ok(!reads.some((path) => path === 'meeting_sessions' || path.endsWith('/attendees') || path === 'flashcards'));
    assert.deepEqual(unexpectedErrors(errors), []);
    await ctx.context.close();
  });

  test('índice apontando para sessão apagada não quebra a lista', async () => {
    const backend = createFakeBackend();
    backend.adminSet(`user_sessions/${ACTORS.studentA.uid}/sessao-apagada`, { topic: 'Removida', startedAt: '2026-10-01T19:00:00.000Z' });
    const ctx = await newContext(browser, backend);
    const { page, errors } = await openPage(ctx, 'flash-cards.html', { as: ACTORS.studentA });
    assert.deepEqual(await deckTopics(page), ['Technology & Daily Life', 'Travel']);
    assert.deepEqual(unexpectedErrors(errors), []);
    await ctx.context.close();
  });

  test('equipe continua vendo todos os decks', async () => {
    const backend = createFakeBackend();
    const ctx = await newContext(browser, backend);
    const { page } = await openPage(ctx, 'flash-cards.html', { as: ACTORS.mediatorB });
    assert.deepEqual(await deckTopics(page), ['Technology & Daily Life', 'Travel', 'Travel II']);
    await ctx.context.close();
  });
});
