/**
 * @file Formatação de datas e textos para exibição (funções puras).
 */

/** Data atual em ISO 8601, formato usado em todos os campos `*At` do banco. */
export function nowIso() {
  return new Date().toISOString();
}

/**
 * "21/09/2026" — usado nos cards de flashcards.
 * @param {string|undefined} isoDate
 * @returns {string} texto vazio quando não há data
 */
export function formatDate(isoDate) {
  if (!isoDate) return '';
  return new Date(isoDate).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

/**
 * "21/09/2026, 15:30" — usado no histórico de sessões.
 * @param {string|undefined} isoDate
 * @param {string} [fallback]
 * @returns {string}
 */
export function formatDateTime(isoDate, fallback = 'Data não informada') {
  if (!isoDate) return fallback;
  return new Date(isoDate).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Corta um texto longo e acrescenta reticências.
 * @param {string} text
 * @param {number} max número máximo de caracteres antes do corte
 */
export function truncate(text, max) {
  return text.length > max ? `${text.substring(0, max)}...` : text;
}
