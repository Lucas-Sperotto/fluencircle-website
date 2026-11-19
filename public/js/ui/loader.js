/**
 * @file Indicador de carregamento de tela cheia (três bolinhas).
 *
 * Criado sob demanda, então as páginas não precisam repetir a marcação.
 */
import { h } from './dom.js';

const LOADER_ID = 'page-loader';

function ensureLoader() {
  let loader = document.getElementById(LOADER_ID);
  if (!loader) {
    loader = h('div', { id: LOADER_ID, class: 'loading-gif hidden', role: 'status', 'aria-label': 'Carregando' },
      h('div', { class: 'circle one' }),
      h('div', { class: 'circle two' }),
      h('div', { class: 'circle three' }));
    document.body.append(loader);
  }
  return loader;
}

/** @param {boolean} active mostra ou esconde o indicador */
export function setPageLoading(active) {
  ensureLoader().classList.toggle('hidden', !active);
}
