/**
 * @file Decisão pura sobre o destino de tradução assíncrona, sem Firebase/DOM.
 * Nunca associar vocabulário antigo a uma sessão substituída.
 */

/**
 * @param {{sessionId?: string}|null|undefined} origin
 * @param {{sessionId?: string}|null|undefined} current
 * @returns {boolean}
 */
export function canSaveTranslationToSession(origin, current) {
  return Boolean(origin?.sessionId && origin.sessionId === current?.sessionId);
}
