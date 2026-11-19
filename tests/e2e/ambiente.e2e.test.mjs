/**
 * E2E — seleção verificável de ambiente (Issue #15). Em origem local a página
 * usa o projeto demo + Emulator e mostra o selo; em origem de produção, não.
 * Em nenhum caso a página tenta falar com serviço real (rede bloqueada e registrada).
 */
import { describe, test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createFakeBackend, launchBrowser, newContext, openPage, ORIGINS, unexpectedErrors } from './support/harness.mjs';
import { ACTORS } from '../fixtures/synthetic-data.mjs';

const firebaseInfo = (page) => page.evaluate(() => ({
  projectId: globalThis.__e2eFirebase?.apps?.['[DEFAULT]']?.projectId,
  emulators: (globalThis.__e2eFirebase?.emulators || []).map((e) => `${e.service}:${e.host ?? ''}${e.port ? `:${e.port}` : ''}${e.url ?? ''}`),
  badge: document.getElementById('environment-badge')?.textContent || null,
}));

describe('E2E [Firebase simulado] seleção de ambiente', () => {
  let browser;
  before(async () => { browser = await launchBrowser(); });
  after(async () => { await browser?.close(); });

  for (const pagePath of ['auth.html', 'circle-translator.html']) {
    test(`origem local: ${pagePath} usa demo-fluencircle-audit, conecta o Emulator e mostra o selo`, async () => {
      const ctx = await newContext(browser, createFakeBackend(), { origin: ORIGINS.local });
      const { page, errors } = await openPage(ctx, pagePath);
      await page.locator('#environment-badge').waitFor();
      const info = await firebaseInfo(page);
      assert.equal(info.projectId, 'demo-fluencircle-audit');
      assert.ok(info.emulators.includes('database:127.0.0.1:9000'), JSON.stringify(info.emulators));
      if (pagePath === 'auth.html') assert.ok(info.emulators.includes('auth:http://127.0.0.1:9099'), JSON.stringify(info.emulators));
      assert.match(info.badge, /Firebase Emulator \(demo-fluencircle-audit\)/);
      assert.deepEqual(ctx.network.blocked, []);
      assert.deepEqual(unexpectedErrors(errors), []);
      await ctx.context.close();
    });
  }

  test('origem local logada: selo também nas páginas internas', async () => {
    const ctx = await newContext(browser, createFakeBackend(), { origin: ORIGINS.local });
    const { page } = await openPage(ctx, 'index.html', { as: ACTORS.mediatorA });
    await page.locator('#user-email', { hasText: ACTORS.mediatorA.email }).waitFor();
    assert.ok((await firebaseInfo(page)).badge);
    await ctx.context.close();
  });

  test('origem de produção: configuração real, sem Emulator e sem selo (nada sai da máquina no teste)', async () => {
    const ctx = await newContext(browser, createFakeBackend(), { origin: ORIGINS.production });
    const { page, errors } = await openPage(ctx, 'auth.html');
    await page.waitForFunction(() => globalThis.__e2eFirebase?.apps?.['[DEFAULT]']);
    const info = await firebaseInfo(page);
    assert.equal(info.projectId, 'fluentech-1e18a');
    assert.deepEqual(info.emulators, []);
    assert.equal(info.badge, null);
    assert.deepEqual(ctx.network.blocked, []);
    assert.deepEqual(unexpectedErrors(errors), []);
    await ctx.context.close();
  });
});
