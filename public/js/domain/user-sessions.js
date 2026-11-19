/**
 * @file Índice de presença do aluno (`user_sessions/{uid}`) — funções puras (Issue #10).
 *
 * O aluno lê SÓ o próprio índice e, a partir dele, os cards das sessões de
 * que participou. Assim não precisa (nem pode) ler a coleção inteira de
 * sessões, que inclui a lista de presença de outras pessoas.
 *
 * Formatos aceitos em `user_sessions/{uid}/{sessionId}`:
 * - novo: `{ topic, startedAt }` — resumo suficiente para montar o deck;
 * - antigo: `true` — o resumo precisa ser lido em `meeting_sessions/{id}/topic`
 *   e `/startedAt` (campos que a regra libera para quem participou).
 */

/**
 * @typedef {{ topic: string, startedAt: string }} SessionSummary
 * @typedef {{ sessionId: string, summary: SessionSummary | null }} IndexEntry
 */

/** O valor tem o resumo da sessão (formato novo)? */
export function isSessionSummary(value) {
  return Boolean(value) && typeof value === 'object' && typeof value.topic === 'string' && typeof value.startedAt === 'string';
}

/**
 * Converte o índice lido do banco em lista de entradas.
 * Valores falsos ou estranhos são ignorados (o índice não é confiável a ponto de quebrar a tela).
 * @param {Record<string, unknown> | null | undefined} index
 * @returns {IndexEntry[]}
 */
export function parseUserSessionIndex(index) {
  if (!index || typeof index !== 'object') return [];
  const entries = [];
  for (const [sessionId, value] of Object.entries(index)) {
    if (isSessionSummary(value)) entries.push({ sessionId, summary: { topic: value.topic, startedAt: value.startedAt } });
    else if (value === true) entries.push({ sessionId, summary: null });
  }
  return entries;
}

/**
 * Ordem da lista de decks: revisões pendentes primeiro; depois as sessões mais recentes.
 * @template {{ startedAt?: string, srs: { isDue: boolean } }} Deck
 * @param {Deck[]} decks
 * @returns {Deck[]} nova lista ordenada
 */
export function sortDecks(decks) {
  return [...decks].sort((a, b) => {
    if (a.srs.isDue !== b.srs.isDue) return a.srs.isDue ? -1 : 1;
    return (Date.parse(b.startedAt || '') || 0) - (Date.parse(a.startedAt || '') || 0);
  });
}
