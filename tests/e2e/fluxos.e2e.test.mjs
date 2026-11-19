/**
 * E2E — fluxos principais pela interface, com o banco simulado aplicando as
 * regras propostas: temas, sessão ao vivo (publicação, presença, tradutor,
 * encerramento), tradutor público, estudo com revisão espaçada, contas e
 * exclusão de sessão.
 */
import { describe, test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createFakeBackend, launchBrowser, newContext, openPage, expectToast, unexpectedErrors } from './support/harness.mjs';
import { ACTORS, SESSIONS, DEMO_PASSWORD } from '../fixtures/synthetic-data.mjs';
import { startLiveSession, finishDeck } from './support/actions.mjs';

describe('E2E [Firebase simulado] fluxos principais', () => {
  let browser;
  before(async () => { browser = await launchBrowser(); });
  after(async () => { await browser?.close(); });

  test('mediador cria tema com aspas e acentos', async () => {
    const backend = createFakeBackend();
    const ctx = await newContext(browser, backend);
    const { page, errors } = await openPage(ctx, 'set-meeting.html', { as: ACTORS.mediatorA });
    await page.locator('#open-create-theme-btn').click();
    await page.fill('#topic-input', 'Música & "Canções"');
    await page.locator('.new-question-input').first().fill('Qual é a sua música favorita?');
    await page.locator('#set-button').click();
    await expectToast(page, 'Novo tema criado com sucesso!');
    const topics = Object.values(backend.adminGet('meetings')).map((theme) => theme.topic);
    assert.ok(topics.includes('Música & "Canções"'));
    assert.deepEqual(unexpectedErrors(errors), []);
    await ctx.context.close();
  });

  test('sessão ao vivo: publica para o tradutor, registra presença e card e encerra', async () => {
    const backend = createFakeBackend();
    const staff = await newContext(browser, backend);
    const visitor = await newContext(browser, backend);
    const { page: mediator, errors } = await openPage(staff, 'presentation.html', { as: ACTORS.mediatorA });
    const { page: translator } = await openPage(visitor, 'circle-translator.html');
    await translator.locator('#sessionName', { hasText: 'Nenhuma sessão ativa' }).waitFor();

    await startLiveSession(mediator, 'Technology & Daily Life');
    await expectToast(mediator, 'Sessão iniciada');
    await translator.locator('#sessionName', { hasText: 'Sessão ativa: Technology & Daily Life' }).waitFor();
    const live = backend.adminGet('current_session');
    const session = backend.adminGet(`meeting_sessions/${live.sessionId}`);
    assert.equal(session.mediatorEmail, ACTORS.mediatorA.email);

    await mediator.locator('#open-attendance-btn').click();
    await mediator.fill('#attendance-search-bar', 'Ana');
    await mediator.locator('#student-options-list .custom-select-option', { hasText: 'Ana Aluna' }).click();
    await expectToast(mediator, 'Ana Aluna adicionado à lista de presença!');
    assert.ok(backend.adminGet(`meeting_sessions/${live.sessionId}/attendees/${ACTORS.studentA.uid}`));
    assert.ok(backend.adminGet(`user_sessions/${ACTORS.studentA.uid}/${live.sessionId}`));
    await mediator.locator('#close-attendance-btn').click();

    await mediator.locator('#open-translator-btn').click();
    await mediator.fill('#normal-text', 'suitcase');
    await mediator.locator('#translate-btn').click();
    await mediator.waitForFunction(() => document.getElementById('translated-text').value === 'mala');
    await mediator.locator('#add-flashcards-btn').click();
    await expectToast(mediator, 'Card "suitcase" adicionado aos Flashcards!');
    const cards = Object.values(backend.adminGet(`flashcards/${live.sessionId}`));
    assert.deepEqual(cards.map((card) => [card.front, card.back]), [['suitcase', 'mala']]);

    await mediator.locator('#end-meeting-btn').click();
    await mediator.locator('.modal--confirm [data-action="confirm"]').click();
    await expectToast(mediator, 'Sessão encerrada');
    assert.equal(backend.adminGet('current_session'), null);
    await translator.locator('#sessionName', { hasText: 'Nenhuma sessão ativa' }).waitFor();
    assert.deepEqual(unexpectedErrors(errors), []);
    await staff.context.close();
    await visitor.context.close();
  });

  test('tradutor público: visitante traduz, mas NÃO grava flashcard direto no banco', async () => {
    const backend = createFakeBackend();
    backend.adminSet('current_session', { sessionId: SESSIONS.both, topic: 'Travel', startedAt: '2026-11-19T14:00:00.000Z' });
    const before = backend.adminGet(`flashcards/${SESSIONS.both}`);
    const ctx = await newContext(browser, backend);
    const { page } = await openPage(ctx, 'circle-translator.html');
    await page.locator('#sessionName', { hasText: 'Sessão ativa: Travel' }).waitFor();
    await page.fill('#sourceText', 'dog');
    await page.locator('#translateBtn').click();
    await page.waitForFunction(() => document.getElementById('targetText').value === 'cachorro');
    await page.locator('#statusMessage.error, #statusMessage.warning, #statusMessage.info').waitFor();
    assert.deepEqual(backend.adminGet(`flashcards/${SESSIONS.both}`), before, 'regra deve negar a escrita anônima');
    assert.equal(ctx.network.translations.length, 1);
    await ctx.context.close();
  });

  test('aluna estuda deck liberado e a etapa 1 é gravada (regra aceita só +1)', async () => {
    const backend = createFakeBackend();
    const ctx = await newContext(browser, backend);
    const { page, errors } = await openPage(ctx, 'flash-cards.html', { as: ACTORS.studentA });
    await page.locator('#sessions-grid .srs-meeting-card', { hasText: 'Travel' }).click();
    await finishDeck(page);
    await expectToast(page, 'Etapa de 1 Dia concluída!');
    const review = backend.adminGet(`student_reviews/${ACTORS.studentA.uid}/${SESSIONS.both}`);
    assert.equal(review.stage, 1);
    assert.equal(review.stage1CompletedAt, '2026-11-19T15:00:00.000Z');
    assert.deepEqual(unexpectedErrors(errors), []);
    await ctx.context.close();
  });

  test('admin cria conta de aluno; a nova conta entra no site', async () => {
    const backend = createFakeBackend();
    const adminCtx = await newContext(browser, backend);
    const { page } = await openPage(adminCtx, 'admin.html', { as: ACTORS.admin });
    await page.locator('#users-table-body .user-name-cell').first().waitFor();
    await page.locator('#open-create-user-modal-btn').click();
    await page.fill('#user-firstname', 'Helena');
    await page.fill('#user-lastname', 'Nova');
    await page.fill('#user-email-input', 'helena.nova@example.test');
    await page.fill('#user-password-input', DEMO_PASSWORD);
    await page.selectOption('#user-role-select', 'student');
    await page.locator('#save-user-btn').click();
    await expectToast(page, 'Perfil de Helena criado com sucesso!');
    const created = Object.values(backend.adminGet('users')).find((user) => user.email === 'helena.nova@example.test');
    assert.equal(created.role, 'student');
    assert.equal(await page.locator('#user-email').textContent(), ACTORS.admin.email, 'admin continua logado');

    const newCtx = await newContext(browser, backend);
    const { page: login } = await openPage(newCtx, 'auth.html');
    await login.fill('#email', 'helena.nova@example.test');
    await login.fill('#password', DEMO_PASSWORD);
    await login.click('#login-btn');
    await login.waitForURL(/index\.html$/);
    await adminCtx.context.close();
    await newCtx.context.close();
  });

  test('mediador exclui sessão: sessão, cards e índices somem juntos', async () => {
    const backend = createFakeBackend();
    const ctx = await newContext(browser, backend);
    const { page } = await openPage(ctx, 'manage-meetings.html', { as: ACTORS.mediatorA });
    await page.locator('.manage-meeting-card', { hasText: 'Travel II' }).click();
    await page.locator('#delete-session-btn').click();
    await page.locator('.modal--confirm [data-action="confirm"]').click();
    await expectToast(page, 'Sessão e cartões excluídos com sucesso.');
    assert.equal(backend.adminGet(`meeting_sessions/${SESSIONS.brunoOnly}`), null);
    assert.equal(backend.adminGet(`flashcards/${SESSIONS.brunoOnly}`), null);
    assert.equal(backend.adminGet(`user_sessions/${ACTORS.studentB.uid}/${SESSIONS.brunoOnly}`), null);
    assert.ok(backend.adminGet(`user_sessions/${ACTORS.studentB.uid}/${SESSIONS.both}`), 'outras sessões ficam');
    await ctx.context.close();
  });
});
