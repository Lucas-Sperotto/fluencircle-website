/**
 * E2E — checagens BÁSICAS de acessibilidade (tests/e2e/support/a11y.mjs) nas
 * nove páginas, nos estados principais, e navegação por teclado em fluxos
 * críticos. Não substitui auditoria WCAG completa nem teste com leitor de tela.
 */
import { describe, test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createFakeBackend, launchBrowser, newContext, openPage } from './support/harness.mjs';
import { auditAccessibility } from './support/a11y.mjs';
import { ACTORS } from '../fixtures/synthetic-data.mjs';
import { startLiveSession } from './support/actions.mjs';

const PAGES = [
  { path: 'auth.html', as: null, ready: '#login-form' },
  { path: 'circle-translator.html', as: null, ready: '#sessionName:not(:empty)' },
  { path: 'index.html', as: ACTORS.studentA, ready: '#student-agenda .week-slot' },
  { path: 'flash-cards.html', as: ACTORS.studentA, ready: '#sessions-grid .srs-meeting-card' },
  { path: 'presentation.html', as: ACTORS.mediatorA, ready: '#option-list .meeting-option' },
  { path: 'set-meeting.html', as: ACTORS.mediatorA, ready: '#themes-grid .manage-theme-card' },
  { path: 'manage-meetings.html', as: ACTORS.mediatorA, ready: '.manage-meeting-card' },
  { path: 'admin.html', as: ACTORS.admin, ready: '#users-table-body .user-name-cell' },
  { path: 'plans.html', as: ACTORS.admin, ready: '#week-agenda .week-slot' },
];

describe('E2E [Firebase simulado] acessibilidade básica', () => {
  let browser;
  before(async () => { browser = await launchBrowser(); });
  after(async () => { await browser?.close(); });

  for (const { path, as, ready } of PAGES) {
    test(`${path} (${as ? as.role : 'visitante'}): sem violações básicas no estado inicial`, async () => {
      const ctx = await newContext(browser, createFakeBackend());
      const { page } = await openPage(ctx, path, { as });
      await page.locator(ready).first().waitFor({ state: 'attached' });
      assert.deepEqual(await auditAccessibility(page), []);
      await ctx.context.close();
    });
  }

  test('estados abertos: modo de estudo, editor de tema, editor de sessão e modal de conta', async () => {
    const backend = createFakeBackend();
    const ctx = await newContext(browser, backend);
    const states = [
      ['flash-cards.html', ACTORS.studentA, (p) => p.locator('#sessions-grid .srs-meeting-card').first().click(), '#flash-cards-container .card'],
      ['set-meeting.html', ACTORS.mediatorA, (p) => p.locator('#open-create-theme-btn').click(), '.new-question-input'],
      ['manage-meetings.html', ACTORS.mediatorA, (p) => p.locator('.manage-meeting-card').first().click(), '.card-editor-row, #cards-editor-container .empty-state'],
      ['admin.html', ACTORS.admin, async (p) => { await p.locator('#users-table-body .user-name-cell').first().waitFor(); await p.locator('#open-create-user-modal-btn').click(); }, '#user-form-modal:not(.hidden)'],
      ['plans.html', ACTORS.mediatorA, (p) => p.locator('#week-agenda .week-slot').first().click(), '#slot-modal:not(.hidden)'],
      ['plans.html', ACTORS.admin, async (p) => { await p.locator('#week-agenda .week-slot').first().waitFor(); await p.locator('#tab-plans').click(); await p.locator('#open-create-plan-btn').click(); }, '#plan-modal:not(.hidden)'],
    ];
    for (const [path, as, open, ready] of states) {
      const { page } = await openPage(ctx, path, { as });
      await open(page);
      await page.locator(ready).first().waitFor();
      assert.deepEqual(await auditAccessibility(page), [], path);
      await page.close();
    }
    await ctx.context.close();
  });

  test('sessão ao vivo com gaveta de presença e tradutor abertos', async () => {
    const ctx = await newContext(browser, createFakeBackend());
    const { page } = await openPage(ctx, 'presentation.html', { as: ACTORS.mediatorA });
    await startLiveSession(page, 'Travel');
    await page.locator('.slide-content:not(.hidden)').waitFor();
    await page.locator('#open-attendance-btn').click();
    await page.locator('#attendance-drawer:not(.hidden)').waitFor();
    assert.deepEqual(await auditAccessibility(page), [], 'gaveta de presença');
    await page.locator('#close-attendance-btn').click();
    await page.locator('#open-translator-btn').click();
    await page.locator('#translator-modal:not(.hidden)').waitFor();
    assert.deepEqual(await auditAccessibility(page), [], 'modal do tradutor');
    await ctx.context.close();
  });

  test('teclado: diálogo de confirmação começa em "Cancelar" e fecha com Esc', async () => {
    const backend = createFakeBackend();
    const ctx = await newContext(browser, backend);
    const { page } = await openPage(ctx, 'manage-meetings.html', { as: ACTORS.mediatorA });
    await page.locator('.manage-meeting-card').first().click();
    await page.locator('#delete-session-btn').click();
    await page.locator('.modal--confirm').waitFor();
    assert.equal(await page.evaluate(() => document.activeElement?.dataset.action), 'cancel');
    await page.keyboard.press('Escape');
    await page.locator('.modal--confirm').waitFor({ state: 'detached' });
    assert.ok(backend.adminGet('meeting_sessions/sess-ana'), 'nada foi excluído');
    await ctx.context.close();
  });

  test('teclado: tema escolhido com Enter e tradutor público acionado com Enter', async () => {
    const backend = createFakeBackend();
    const ctx = await newContext(browser, backend);
    const { page } = await openPage(ctx, 'presentation.html', { as: ACTORS.mediatorA });
    await page.locator('#option-list .meeting-option').first().waitFor({ state: 'attached' });
    await page.locator('#presentation-select').focus();
    await page.keyboard.press('Enter');
    await page.locator('#option-list .meeting-option').first().focus();
    await page.keyboard.press('Enter');
    await page.locator('#start-presentation-btn:not([disabled])').waitFor();

    const { page: translator } = await openPage(ctx, 'circle-translator.html');
    await translator.locator('#sourceText').fill('house');
    await translator.locator('#sourceText').press('Enter');
    await translator.waitForFunction(() => document.getElementById('targetText').value === 'casa');
    await ctx.context.close();
  });
});
