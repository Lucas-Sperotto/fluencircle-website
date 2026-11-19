/**
 * @file Ações de interface reutilizadas pelos testes E2E.
 */

/** Escolhe o tema na tela de sessão ao vivo e clica em "Iniciar". */
export async function startLiveSession(page, topic) {
  await page.locator('#presentation-select').click();
  await page.locator('#option-list .meeting-option', { hasText: topic }).click();
  await page.locator('#start-presentation-btn:not([disabled])').click();
}

/** Conclui a pilha do modo de estudo clicando em "Acertei" no cartão do topo. */
export async function finishDeck(page) {
  for (let i = 0; i < 50; i++) {
    if (await page.locator('#completion-card:not(.hidden)').count()) return;
    await page.evaluate(() => document.querySelector('.card[data-position="0"] .btn-next')?.click());
    await page.waitForTimeout(200);
  }
  throw new Error('A pilha não terminou.');
}

/** Faz login pelo formulário de auth.html. */
export async function login(page, email, password) {
  await page.fill('#email', email);
  await page.fill('#password', password);
  await page.click('#login-btn');
}
