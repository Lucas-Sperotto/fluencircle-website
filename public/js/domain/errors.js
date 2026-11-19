/**
 * @file Classificação de erros vindos do Firebase/backend (funções puras).
 *
 * Usada para mostrar a mensagem certa: "negado pelas regras" é diferente de
 * "sem conexão" e de "erro inesperado".
 */

/**
 * A operação foi negada pelas regras de segurança do banco?
 * O SDK do Realtime Database usa `PERMISSION_DENIED` no código e/ou na mensagem.
 * @param {unknown} error
 * @returns {boolean}
 */
export function isPermissionDenied(error) {
  if (!error || typeof error !== 'object') return false;
  return /permission[_ -]?denied/i.test(`${error.code ?? ''} ${error.message ?? ''}`);
}
