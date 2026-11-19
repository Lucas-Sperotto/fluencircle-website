/**
 * @file Inicialização comum das páginas internas (área logada).
 *
 * Toda página interna começa com `const session = await initProtectedPage(...)`.
 * A função liga o botão "Sair", espera o Firebase confirmar quem está logado,
 * mostra e-mail e papel no cabeçalho e barra quem não tem o papel exigido.
 */
import { requireAuth, logout } from '../../services/auth.service.js';
import { mountAppShell, setShellUser, onLogoutClick } from '../../ui/app-shell.js';
import { showToast } from '../../ui/toast.js';
import { setPageLoading } from '../../ui/loader.js';
import { hasRole } from '../../core/roles.js';
import { PAGES, goTo } from '../../core/navigation.js';
import { ACCESS_DENIED_REDIRECT_MS } from '../../config/app.config.js';

/**
 * @param {Object} [options]
 * @param {readonly string[]} [options.allowedRoles] papéis aceitos; omitido = qualquer usuário logado
 * @param {string} [options.deniedMessage] aviso para quem não tem o papel
 * @returns {Promise<{ user: object, role: string } | null>} null quando o acesso foi negado
 */
export async function initProtectedPage({ allowedRoles = null, deniedMessage = 'Acesso restrito.' } = {}) {
  mountAppShell();
  onLogoutClick(async () => {
    setPageLoading(true);
    try {
      await logout();
    } finally {
      goTo(PAGES.login);
    }
  });

  const session = await requireAuth();
  setShellUser({ email: session.user.email, role: session.role });

  if (allowedRoles && !hasRole(session.role, allowedRoles)) {
    showToast(deniedMessage, 'error');
    setTimeout(() => goTo(PAGES.home), ACCESS_DENIED_REDIRECT_MS);
    return null;
  }
  return session;
}
