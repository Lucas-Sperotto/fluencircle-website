/**
 * @file Página inicial (index.html).
 *
 * Os atalhos são links comuns (`<a>`); por papel, o app-shell esconde os que
 * o usuário não pode usar. Aqui só é preciso exigir login.
 */
import { initProtectedPage } from './shared/page-setup.js';

initProtectedPage();
