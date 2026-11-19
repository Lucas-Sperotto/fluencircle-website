/**
 * E2E — perfis de acesso pela interface: visitante, aluno A/B, mediador,
 * admin, conta sem perfil e conta revogada. A interface só esconde/redireciona;
 * a autorização real está nas regras (tests/rules/), que o banco simulado aplica.
 */
import { describe, test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createFakeBackend, launchBrowser, newContext, openPage, expectToast, unexpectedErrors } from './support/harness.mjs';
import { ACTORS, DEMO_PASSWORD } from '../fixtures/synthetic-data.mjs';
import { login as loginForm } from './support/actions.mjs';

const login = (page, email, password = DEMO_PASSWORD) => loginForm(page, email, password);

const deckTopics = async (page) => {
  await page.locator('#sessions-grid .srs-meeting-card, #sessions-grid .empty-state').first().waitFor();
  return (await page.locator('#sessions-grid .srs-card-topic').allTextContents()).sort();
};

const visibleShortcuts = (page) => page.$$eval('#home-page a.home-btn', (links) => links
  .filter((link) => !link.classList.contains('hidden') && getComputedStyle(link).display !== 'none')
  .map((link) => link.getAttribute('href')).sort());

describe('E2E [Firebase simulado] perfis e redirecionamentos', () => {
  let browser;
  before(async () => { browser = await launchBrowser(); });
  after(async () => { await browser?.close(); });

  test('visitante que abre a home é levado ao login', async () => {
    const ctx = await newContext(browser, createFakeBackend());
    const { page } = await openPage(ctx, 'index.html');
    await page.waitForURL(/auth\.html$/);
    await ctx.context.close();
  });

  test('login recusa senha errada, conta sem perfil e conta revogada', async () => {
    const ctx = await newContext(browser, createFakeBackend());
    const { page } = await openPage(ctx, 'auth.html');
    await login(page, ACTORS.studentA.email, 'senha-errada');
    await expectToast(page, 'E-mail ou senha incorretos.');
    await login(page, ACTORS.noProfile.email);
    await expectToast(page, 'Conta não encontrada ou acesso revogado.');
    await login(page, ACTORS.revoked.email);
    await expectToast(page, 'Esta conta foi excluída pelo administrador.');
    assert.match(page.url(), /auth\.html$/);
    await ctx.context.close();
  });

  test('aluna A entra, vê só atalhos de aluno e só os próprios decks', async () => {
    const ctx = await newContext(browser, createFakeBackend());
    const { page, errors } = await openPage(ctx, 'auth.html');
    await login(page, ACTORS.studentA.email);
    await page.waitForURL(/index\.html$/);
    await page.locator('#user-role-badge', { hasText: 'Aluno' }).waitFor();
    assert.deepEqual(await visibleShortcuts(page), ['flash-cards.html']);
    await page.goto(page.url().replace('index.html', 'flash-cards.html'));
    assert.deepEqual(await deckTopics(page), ['Technology & Daily Life', 'Travel']);
    assert.deepEqual(unexpectedErrors(errors), []);
    await ctx.context.close();
  });

  test('aluno B vê os próprios decks e não os da aluna A', async () => {
    const ctx = await newContext(browser, createFakeBackend());
    const { page } = await openPage(ctx, 'flash-cards.html', { as: ACTORS.studentB });
    assert.deepEqual(await deckTopics(page), ['Travel', 'Travel II']);
    await ctx.context.close();
  });

  for (const restricted of ['presentation.html', 'set-meeting.html', 'manage-meetings.html']) {
    test(`aluno é barrado em ${restricted}`, async () => {
      const ctx = await newContext(browser, createFakeBackend());
      const { page } = await openPage(ctx, restricted, { as: ACTORS.studentA });
      await expectToast(page, 'Acesso restrito a Mediadores.');
      await page.waitForURL(/index\.html$/);
      await ctx.context.close();
    });
  }

  test('mediador vê atalhos de equipe e é barrado na tela de acessos', async () => {
    const ctx = await newContext(browser, createFakeBackend());
    const { page } = await openPage(ctx, 'index.html', { as: ACTORS.mediatorA });
    await page.locator('#user-role-badge', { hasText: 'Mediador' }).waitFor();
    assert.deepEqual(await visibleShortcuts(page), ['flash-cards.html', 'presentation.html', 'set-meeting.html']);
    await page.goto(page.url().replace('index.html', 'admin.html'));
    await expectToast(page, 'Acesso negado. Página restrita a Administradores.');
    await page.waitForURL(/index\.html$/);
    await ctx.context.close();
  });

  test('admin lista todos os perfis na tela de acessos', async () => {
    const ctx = await newContext(browser, createFakeBackend());
    const { page, errors } = await openPage(ctx, 'admin.html', { as: ACTORS.admin });
    await page.locator('#users-table-body tr .user-name-cell').first().waitFor();
    const emails = (await page.locator('#users-table-body tr td:nth-child(2)').allTextContents()).sort();
    assert.deepEqual(emails, [ACTORS.admin, ACTORS.studentA, ACTORS.studentB, ACTORS.mediatorA, ACTORS.mediatorB].map((a) => a.email).sort());
    assert.deepEqual(unexpectedErrors(errors), []);
    await ctx.context.close();
  });
});
