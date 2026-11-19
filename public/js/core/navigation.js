/**
 * @file Endereços das páginas e navegação.
 *
 * Os nomes dos arquivos HTML foram mantidos para não quebrar links salvos
 * e o QR code do tradutor. Use sempre `PAGES` em vez de escrever o nome do arquivo.
 */
export const PAGES = Object.freeze({
  login: 'auth.html',
  home: 'index.html',
  flashcards: 'flash-cards.html',
  presentation: 'presentation.html',
  themes: 'set-meeting.html',
  sessions: 'manage-meetings.html',
  admin: 'admin.html',
  plans: 'plans.html',
  translator: 'circle-translator.html',
});

/**
 * Navega para uma página do site.
 * @param {string} page um dos valores de `PAGES`
 */
export function goTo(page) {
  window.location.href = page;
}
