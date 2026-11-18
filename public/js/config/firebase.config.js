/**
 * @file Configuração web do Firebase (projeto `fluentech-1e18a`).
 *
 * Estes valores NÃO são segredos: o Firebase os entrega a qualquer navegador
 * que abra o site, e eles já estavam publicados no repositório. Escondê-los
 * no `.gitignore` não protege nada. O que protege os dados é:
 *   1. as regras do Realtime Database (ver `docs/firebase/database.rules.proposta.json`);
 *   2. o App Check;
 *   3. a restrição da chave por domínio no Google Cloud Console.
 *
 * Para apontar o site para outro projeto (por exemplo, um projeto de testes),
 * troque apenas os valores abaixo. Nenhum outro arquivo repete esta configuração.
 */

/** Opções passadas a `initializeApp` em `core/firebase.js`. */
export const firebaseConfig = Object.freeze({
  apiKey: 'AIzaSyAG6PEwWQADPAs5RjwzqbrO0DRBXVIv7G0',
  authDomain: 'fluentech-1e18a.firebaseapp.com',
  databaseURL: 'https://fluentech-1e18a-default-rtdb.firebaseio.com',
  projectId: 'fluentech-1e18a',
  storageBucket: 'fluentech-1e18a.firebasestorage.app',
  messagingSenderId: '429228883820',
  appId: '1:429228883820:web:2c71b892fb57c23f05bd49',
});
