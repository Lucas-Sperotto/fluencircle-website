/**
 * E2E — concorrência na sessão ativa (Issue #9) pela interface: dois
 * mediadores, duas abas do mesmo mediador, queda e retorno de conexão.
 * O banco simulado aplica as regras propostas (versão, posse, "assumir").
 */
import { describe, test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createFakeBackend, launchBrowser, newContext, openPage, expectToast, unexpectedErrors } from './support/harness.mjs';
import { ACTORS } from '../fixtures/synthetic-data.mjs';
import { startLiveSession } from './support/actions.mjs';

const status = (page) => page.locator('#presentation-status').textContent();
const waitStatus = (page, text) => page.locator('#presentation-status', { hasText: text }).waitFor();
const translatorShows = (page, text) => page.locator('#sessionName', { hasText: text }).waitFor();
const countSessions = (backend) => Object.keys(backend.adminGet('meeting_sessions') || {}).length;

describe('E2E [Firebase simulado] sessão ativa com dois mediadores, duas abas e queda de rede', () => {
  let browser;
  before(async () => { browser = await launchBrowser(); });
  after(async () => { await browser?.close(); });

  test('mediador B é avisado, pode cancelar e, ao assumir, a tela de A é avisada', async () => {
    const backend = createFakeBackend();
    const [ctxA, ctxB, ctxV] = await Promise.all([newContext(browser, backend), newContext(browser, backend), newContext(browser, backend)]);
    const { page: carla, errors } = await openPage(ctxA, 'presentation.html', { as: ACTORS.mediatorA });
    const { page: diego } = await openPage(ctxB, 'presentation.html', { as: ACTORS.mediatorB });
    const { page: visitor } = await openPage(ctxV, 'circle-translator.html');

    await startLiveSession(carla, 'Technology & Daily Life');
    await waitStatus(carla, 'Publicada no tradutor público.');
    await translatorShows(visitor, 'Sessão ativa: Technology & Daily Life');
    const sessionsBefore = countSessions(backend);

    await startLiveSession(diego, 'Travel');
    await diego.locator('.modal--confirm', { hasText: 'Já existe uma sessão no tradutor' }).waitFor();
    await diego.locator('.modal--confirm [data-action="cancel"]').click();
    assert.equal(countSessions(backend), sessionsBefore, 'cancelar não cria sessão');
    assert.equal(backend.adminGet('current_session').topic, 'Technology & Daily Life');

    await diego.locator('#start-presentation-btn:not([disabled])').click();
    await diego.locator('.modal--confirm [data-action="confirm"]').click();
    await waitStatus(diego, 'Publicada no tradutor público.');
    await translatorShows(visitor, 'Sessão ativa: Travel');
    await waitStatus(carla, 'Outra tela assumiu o tradutor público.');
    await expectToast(carla, 'Outra tela assumiu a sessão ativa do tradutor.');

    const node = backend.adminGet('current_session');
    assert.equal(node.version, 2);
    assert.equal(typeof node.takeoverOf, 'string');

    // A encerra na própria tela: o nó de B fica intacto.
    await carla.locator('#end-meeting-btn').click();
    await carla.locator('.modal--confirm [data-action="confirm"]').click();
    await expectToast(carla, 'O tradutor público segue com a outra apresentação.');
    assert.equal(backend.adminGet('current_session').topic, 'Travel');
    assert.deepEqual(unexpectedErrors(errors), []);
    await Promise.all([ctxA.context.close(), ctxB.context.close(), ctxV.context.close()]);
  });

  test('aba antiga fechada depois da troca não derruba a sessão nova', async () => {
    const backend = createFakeBackend();
    const [ctxA, ctxB, ctxV] = await Promise.all([newContext(browser, backend), newContext(browser, backend), newContext(browser, backend)]);
    const { page: carla } = await openPage(ctxA, 'presentation.html', { as: ACTORS.mediatorA });
    const { page: diego } = await openPage(ctxB, 'presentation.html', { as: ACTORS.mediatorB });
    const { page: visitor } = await openPage(ctxV, 'circle-translator.html');
    await startLiveSession(carla, 'Technology & Daily Life');
    await waitStatus(carla, 'Publicada');
    await startLiveSession(diego, 'Travel');
    await diego.locator('.modal--confirm [data-action="confirm"]').click();
    await waitStatus(diego, 'Publicada');

    await carla.close(); // dispara o onDisconnect da aba antiga
    await visitor.waitForTimeout(300);
    const node = backend.adminGet('current_session');
    assert.equal(node.topic, 'Travel');
    assert.equal(Object.keys(node.live).length, 1);
    await translatorShows(visitor, 'Sessão ativa: Travel');
    await Promise.all([ctxA.context.close(), ctxB.context.close(), ctxV.context.close()]);
  });

  test('duas abas do mesmo mediador: a segunda pergunta antes de assumir', async () => {
    const backend = createFakeBackend();
    const ctx = await newContext(browser, backend);
    const { page: tab1 } = await openPage(ctx, 'presentation.html', { as: ACTORS.mediatorA });
    await startLiveSession(tab1, 'Technology & Daily Life');
    await waitStatus(tab1, 'Publicada');
    const tab2 = await ctx.context.newPage();
    await tab2.clock.setFixedTime(new Date('2026-11-19T15:00:00.000Z'));
    await tab2.goto(`${ctx.network.origin}/presentation.html`);
    await startLiveSession(tab2, 'Travel');
    await tab2.locator('.modal--confirm', { hasText: 'Technology & Daily Life' }).waitFor();
    await tab2.locator('.modal--confirm [data-action="confirm"]').click();
    await waitStatus(tab2, 'Publicada');
    await waitStatus(tab1, 'Outra tela assumiu');
    await ctx.context.close();
  });

  test('queda e retorno de rede: sai do tradutor e volta sozinho', async () => {
    const backend = createFakeBackend();
    const [ctxA, ctxV] = await Promise.all([newContext(browser, backend), newContext(browser, backend)]);
    const { page: carla } = await openPage(ctxA, 'presentation.html', { as: ACTORS.mediatorA });
    const { page: visitor } = await openPage(ctxV, 'circle-translator.html');
    await startLiveSession(carla, 'Technology & Daily Life');
    await waitStatus(carla, 'Publicada');
    await translatorShows(visitor, 'Sessão ativa: Technology & Daily Life');

    await backend.dropConnection(carla);
    await waitStatus(carla, 'Sem conexão');
    await translatorShows(visitor, 'Nenhuma sessão ativa');

    await backend.restoreConnection(carla);
    await waitStatus(carla, 'Publicada no tradutor público.');
    await translatorShows(visitor, 'Sessão ativa: Technology & Daily Life');
    assert.equal(backend.adminGet('current_session').version, 1);
    await Promise.all([ctxA.context.close(), ctxV.context.close()]);
  });

  test('enquanto A estava sem rede, B publicou sem pergunta; A volta e vê que perdeu a posse', async () => {
    const backend = createFakeBackend();
    const [ctxA, ctxB] = await Promise.all([newContext(browser, backend), newContext(browser, backend)]);
    const { page: carla } = await openPage(ctxA, 'presentation.html', { as: ACTORS.mediatorA });
    const { page: diego } = await openPage(ctxB, 'presentation.html', { as: ACTORS.mediatorB });
    await startLiveSession(carla, 'Technology & Daily Life');
    await waitStatus(carla, 'Publicada');
    await backend.dropConnection(carla);

    await startLiveSession(diego, 'Travel');
    await waitStatus(diego, 'Publicada');
    assert.equal(await diego.locator('.modal--confirm').count(), 0, 'dona ausente não exige confirmação');

    await backend.restoreConnection(carla);
    await waitStatus(carla, 'Outra tela assumiu');
    assert.equal(backend.adminGet('current_session').topic, 'Travel');
    assert.match(await status(diego), /Publicada/);
    await Promise.all([ctxA.context.close(), ctxB.context.close()]);
  });
});
