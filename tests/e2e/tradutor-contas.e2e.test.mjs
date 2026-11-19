/**
 * E2E — tradutor público e criação de contas (Issues #5 e #8):
 * - no Emulator o visitante traduz e o site NÃO tenta gravar card;
 * - em produção (compatibilidade) a tentativa é negada pelas regras propostas
 *   e a pessoa vê que o card não foi salvo; a tradução continua na tela;
 * - falha do backend de tradução tem mensagem própria e não grava nada;
 * - perfil recusado pelas regras desfaz a conta de login criada.
 */
import { describe, test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createFakeBackend, launchBrowser, newContext, openPage, expectToast, ORIGINS } from './support/harness.mjs';
import { ACTORS, SESSIONS, DEMO_PASSWORD } from '../fixtures/synthetic-data.mjs';

const PRESENTER = 'aba-mediador-b-000001';
const liveSession = { sessionId: SESSIONS.both, topic: 'Travel', startedAt: '2026-11-19T14:00:00.000Z', presenterId: PRESENTER, version: 1, live: { [PRESENTER]: true } };
const anonymousWrites = (backend) => backend.log.filter((entry) => entry.uid === null && /^db\.(set|update|compareAndSet)$/.test(entry.op));

async function translate(page, word) {
  await page.locator('#sessionName', { hasText: 'Sessão ativa: Travel' }).waitFor();
  await page.fill('#sourceText', word);
  await page.locator('#translateBtn').click();
}

describe('E2E [Firebase simulado] tradutor público e contas', () => {
  let browser;
  before(async () => { browser = await launchBrowser(); });
  after(async () => { await browser?.close(); });

  test('Emulator: visitante traduz e o site não tenta gravar flashcard', async () => {
    const backend = createFakeBackend();
    backend.adminSet('current_session', liveSession);
    const ctx = await newContext(browser, backend, { origin: ORIGINS.local });
    const { page } = await openPage(ctx, 'circle-translator.html');
    await translate(page, 'dog');
    await page.waitForFunction(() => document.getElementById('targetText').value === 'cachorro');
    await page.locator('#statusMessage.info', { hasText: 'não salva flashcards automaticamente' }).waitFor();
    assert.deepEqual(anonymousWrites(backend), []);
    await ctx.context.close();
  });

  test('produção (compatibilidade): tentativa direta é negada pelas regras e a tradução fica na tela', async () => {
    const backend = createFakeBackend();
    backend.adminSet('current_session', liveSession);
    const before = backend.adminGet(`flashcards/${SESSIONS.both}`);
    const ctx = await newContext(browser, backend, { origin: ORIGINS.production });
    const { page } = await openPage(ctx, 'circle-translator.html');
    await translate(page, 'house');
    await page.locator('#statusMessage.warning', { hasText: 'bloqueada pelas regras de segurança' }).waitFor();
    assert.equal(await page.inputValue('#targetText'), 'casa');
    assert.equal(anonymousWrites(backend).length, 1, 'houve UMA tentativa, negada');
    assert.deepEqual(backend.adminGet(`flashcards/${SESSIONS.both}`), before);
    await ctx.context.close();
  });

  test('backend de tradução fora do ar: mensagem própria e nenhuma gravação', async () => {
    const backend = createFakeBackend();
    backend.adminSet('current_session', liveSession);
    const ctx = await newContext(browser, backend, { origin: ORIGINS.production, failTranslations: true });
    const { page } = await openPage(ctx, 'circle-translator.html');
    await translate(page, 'dog');
    await page.locator('#statusMessage.error', { hasText: 'Não foi possível traduzir agora' }).waitFor();
    assert.deepEqual(anonymousWrites(backend), []);
    await ctx.context.close();
  });

  test('perfil recusado pelas regras desfaz a conta de login criada', async () => {
    const backend = createFakeBackend();
    const ctx = await newContext(browser, backend);
    const { page } = await openPage(ctx, 'admin.html', { as: ACTORS.admin });
    await page.locator('#users-table-body .user-name-cell').first().waitFor();
    await page.locator('#open-create-user-modal-btn').click();
    await page.fill('#user-firstname', 'N'.repeat(81)); // regra: firstName até 80 caracteres
    await page.fill('#user-lastname', 'Longo');
    await page.fill('#user-email-input', 'nome.longo@example.test');
    await page.fill('#user-password-input', DEMO_PASSWORD);
    await page.locator('#save-user-btn').click();
    await expectToast(page, 'A conta de login criada foi desfeita');
    assert.equal(backend.accountExists('nome.longo@example.test'), false, 'sem conta órfã no Auth');
    assert.ok(!Object.values(backend.adminGet('users')).some((user) => user.email === 'nome.longo@example.test'));
    assert.equal(await page.locator('#user-email').textContent(), ACTORS.admin.email, 'admin continua logado');
    await ctx.context.close();
  });
});
