/**
 * @file Firebase Authentication: instância principal e instância secundária.
 *
 * Separado de `firebase.js` para que páginas públicas (tradutor) não carreguem
 * o módulo de autenticação sem precisar dele.
 */
import {
  getAuth,
  connectAuthEmulator,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  deleteUser,
} from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js';
import { app, initializeApp } from './firebase.js';
import { currentEnvironment } from '../config/environment.js';

/** Liga a instância ao Auth Emulator quando o ambiente é local. */
function connectIfEmulator(authInstance) {
  if (currentEnvironment.emulators) {
    connectAuthEmulator(authInstance, currentEnvironment.emulators.authUrl, { disableWarnings: true });
  }
  return authInstance;
}

/** Sessão de autenticação do usuário que está usando o site. */
export const auth = connectIfEmulator(getAuth(app));

const SECONDARY_APP_NAME = 'SecondaryRegistrationApp';
let secondaryAuth = null;

/**
 * Devolve uma instância de Auth isolada, criada sob demanda.
 *
 * O `createUserWithEmailAndPassword` do SDK web sempre loga a conta recém-criada.
 * Criar a conta numa segunda instância evita derrubar a sessão do administrador.
 * (O ideal é mover a criação de contas para o backend com o Admin SDK — ver
 * Issue #8.)
 *
 * @returns {import('https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js').Auth}
 */
export function getSecondaryAuth() {
  if (!secondaryAuth) {
    secondaryAuth = connectIfEmulator(getAuth(initializeApp(currentEnvironment.firebase, SECONDARY_APP_NAME)));
  }
  return secondaryAuth;
}

export { signInWithEmailAndPassword, signOut, onAuthStateChanged, createUserWithEmailAndPassword, deleteUser };
