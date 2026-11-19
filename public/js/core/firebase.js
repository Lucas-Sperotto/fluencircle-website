/**
 * @file Ponto único de contato com o SDK do Firebase (app + Realtime Database).
 *
 * O SDK é carregado por CDN, sem etapa de build. Para atualizar a versão,
 * troque o número nas URLs deste arquivo e de `firebase-auth.js` — nenhum
 * outro arquivo importa o CDN diretamente.
 *
 * Este módulo NÃO carrega o Firebase Auth: a página pública do tradutor usa só
 * o banco e não precisa baixar o módulo de autenticação.
 */
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js';
import {
  getDatabase,
  ref,
  get,
  set,
  push,
  update,
  remove,
  onValue,
  onDisconnect,
} from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js';
import { firebaseConfig } from '../config/firebase.config.js';

/** Aplicação Firebase padrão, compartilhada por todo o site. */
export const app = initializeApp(firebaseConfig);

/** Instância do Realtime Database. Use-a apenas dentro de `services/`. */
export const database = getDatabase(app);

/** Reexporta as funções do SDK usadas pelos serviços (mantém a versão num só lugar). */
export { initializeApp, ref, get, set, push, update, remove, onValue, onDisconnect };
