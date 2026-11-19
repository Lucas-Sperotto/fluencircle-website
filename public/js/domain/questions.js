/**
 * @file Normalização das perguntas de um tema (função pura).
 */

/**
 * O Realtime Database devolve listas ora como array, ora como objeto
 * (`{0: '...', 1: '...'}`), dependendo de como foram gravadas.
 * Esta função sempre devolve um array de textos, sem posições vazias.
 *
 * @param {unknown} questions valor de `meetings/{id}/questions`
 * @returns {string[]}
 */
export function toQuestionList(questions) {
  let list = [];
  if (Array.isArray(questions)) list = questions;
  else if (questions && typeof questions === 'object') list = Object.values(questions);
  return list.filter((q) => q !== null && q !== undefined);
}
