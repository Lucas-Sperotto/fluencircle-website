/**
 * @file Página de login (auth.html).
 *
 * Quem já tem sessão válida é levado direto para a home.
 */
import { signIn, onSignedIn, resolveAccess } from '../services/auth.service.js';
import { PAGES, goTo } from '../core/navigation.js';
import { showToast } from '../ui/toast.js';
import { setPageLoading } from '../ui/loader.js';
import { byId } from '../ui/dom.js';
import { mountEnvironmentBadge } from '../ui/environment-badge.js';

mountEnvironmentBadge();

const form = byId('login-form');
const submitButton = byId('login-btn');

/** Evita checar o acesso duas vezes enquanto o próprio formulário faz o login. */
let signInInProgress = false;

function setLoading(active) {
  setPageLoading(active);
  submitButton.disabled = active;
}

// Sessão já existente (ou aberta em outra aba): confere o acesso e entra.
onSignedIn(async (user) => {
  if (signInInProgress) return;
  const { role } = await resolveAccess(user);
  if (role) goTo(PAGES.home);
});

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  const email = form.email.value;
  const password = form.password.value;

  if (!email.trim() || !password) {
    showToast('Preencha e-mail e senha.', 'error');
    return;
  }

  signInInProgress = true;
  setLoading(true);
  try {
    await signIn(email, password);
    goTo(PAGES.home);
  } catch (error) {
    setLoading(false);
    showToast(error.message, 'error');
  } finally {
    signInInProgress = false;
  }
});
