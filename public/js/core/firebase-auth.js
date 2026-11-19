/**
 * @file Firebase Authentication: instância principal e instância secundária.
 *
 * Separado de `firebase.js` para que páginas públicas (tradutor) não carreguem
 * o módulo de autenticação sem precisar dele.
 */
import {
  getAuth,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  createUserWithEmailAndPassword,
} from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js';
import { app, initializeApp } from './firebase.js';
import { firebaseConfig } from '../config/firebase.config.js';

/** Sessão de autenticação do usuário que está usando o site. */
export const auth = getAuth(app);

const SECONDARY_APP_NAME = 'SecondaryRegistrationApp';
let secondaryAuth = null;

/**
 * Devolve uma instância de Auth isolada, criada sob demanda.
 *
 * O `createUserWithEmailAndPassword` do SDK web sempre loga a conta recém-criada.
 * Criar a conta numa segunda instância evita derrubar a sessão do administrador.
 * (O ideal é mover a criação de contas para o backend com o Admin SDK — ver
 * docs/AUDITORIA.md.)
 *
 * @returns {import('https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js').Auth}
 */
export function getSecondaryAuth() {
  if (!secondaryAuth) {
    secondaryAuth = getAuth(initializeApp(firebaseConfig, SECONDARY_APP_NAME));
  }
  return secondaryAuth;
}

export { signInWithEmailAndPassword, signOut, onAuthStateChanged, createUserWithEmailAndPassword };
