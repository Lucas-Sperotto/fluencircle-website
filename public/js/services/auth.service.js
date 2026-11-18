/**
 * @file Login, logout e verificação de acesso.
 *
 * Ao entrar, além da senha, o usuário precisa (1) não estar em `deleted_users`
 * e (2) ter perfil em `users`. Isso roda no navegador; a garantia real
 * precisa vir das regras do banco (docs/firebase/database.rules.proposta.json).
 */
import { auth, signInWithEmailAndPassword, signOut, onAuthStateChanged } from '../core/firebase-auth.js';
import { sessionCache } from '../core/session-cache.js';
import { normalizeRole } from '../core/roles.js';
import { PAGES, goTo } from '../core/navigation.js';
import { getUserProfile, isUserBlocked } from './users.service.js';

/** Mensagens para os códigos de erro do Firebase Auth. */
const AUTH_ERROR_MESSAGES = Object.freeze({
  'auth/invalid-email': 'E-mail inválido.',
  'auth/missing-password': 'Por favor, insira a senha.',
  'auth/invalid-credential': 'E-mail ou senha incorretos.',
  'auth/user-not-found': 'Usuário não cadastrado.',
  'auth/wrong-password': 'Senha incorreta.',
  'auth/too-many-requests': 'Muitas tentativas. Aguarde instantes.',
  'auth/network-request-failed': 'Sem conexão com a internet. Verifique sua rede.',
});

/** Mensagens para os motivos de recusa de acesso devolvidos por `resolveAccess`. */
const ACCESS_DENIED_MESSAGES = Object.freeze({
  deleted: 'Esta conta foi excluída pelo administrador.',
  'not-found': 'Conta não encontrada ou acesso revogado.',
  error: 'Não foi possível verificar seu acesso. Tente novamente.',
});

/** Erro de login com mensagem pronta para mostrar ao usuário. */
export class SignInError extends Error {
  /** @param {string} message @param {string} [code] */
  constructor(message, code) {
    super(message);
    this.name = 'SignInError';
    this.code = code;
  }
}

/**
 * Confere se o usuário autenticado pode usar o site e descobre o papel dele.
 * Contas excluídas ou sem perfil são deslogadas.
 *
 * @param {{ uid: string }} user usuário do Firebase Auth
 * @returns {Promise<{ role: string|null, reason: 'deleted'|'not-found'|'error'|null }>}
 */
export async function resolveAccess(user) {
  try {
    const [blocked, profile] = await Promise.all([isUserBlocked(user.uid), getUserProfile(user.uid)]);
    const reason = blocked ? 'deleted' : !profile ? 'not-found' : null;
    if (reason) {
      sessionCache.clear();
      await signOut(auth);
      return { role: null, reason };
    }
    const role = normalizeRole(profile.role);
    sessionCache.setRole(role);
    return { role, reason: null };
  } catch (error) {
    console.error('Erro ao consultar perfil:', error);
    return { role: null, reason: 'error' };
  }
}

/**
 * Faz login com e-mail e senha e valida o acesso.
 * @param {string} email
 * @param {string} password
 * @returns {Promise<{ user: object, role: string }>}
 * @throws {SignInError} com a mensagem a exibir
 */
export async function signIn(email, password) {
  let credential;
  try {
    credential = await signInWithEmailAndPassword(auth, email.trim(), password);
  } catch (error) {
    throw new SignInError(AUTH_ERROR_MESSAGES[error.code] || 'E-mail ou senha incorretos.', error.code);
  }
  const { role, reason } = await resolveAccess(credential.user);
  if (!role) throw new SignInError(ACCESS_DENIED_MESSAGES[reason], reason);
  sessionCache.setEmail(credential.user.email);
  return { user: credential.user, role };
}

/** Encerra a sessão e limpa o cache do perfil. */
export async function logout() {
  sessionCache.clear();
  await signOut(auth);
}

/**
 * Chama `callback(user)` sempre que alguém estiver autenticado (inclusive uma
 * sessão já existente ao abrir a página). Usado pela tela de login.
 * @param {(user: object) => void} callback
 */
export function onSignedIn(callback) {
  onAuthStateChanged(auth, (user) => {
    if (user) callback(user);
  });
}

/**
 * Exige um usuário autenticado e com perfil válido.
 *
 * Sem sessão, ou com conta revogada, redireciona para o login. Continua
 * observando depois de resolver: se a pessoa sair em outra aba, esta também
 * volta para o login.
 *
 * @returns {Promise<{ user: object, role: string }>}
 */
export function requireAuth() {
  return new Promise((resolve) => {
    let resolved = false;
    onAuthStateChanged(auth, async (user) => {
      if (!user) {
        sessionCache.clear();
        goTo(PAGES.login);
        return;
      }
      if (resolved) return;
      const { role } = await resolveAccess(user);
      if (!role) {
        sessionCache.clear();
        goTo(PAGES.login);
        return;
      }
      sessionCache.setEmail(user.email);
      resolved = true;
      resolve({ user, role });
    });
  });
}
