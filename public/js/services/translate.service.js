/**
 * @file Tradução Inglês ⇄ Português pelo backend (que repassa ao Gemini).
 *
 * Única implementação do cliente HTTP do tradutor; antes havia uma cópia em
 * `gemini.js` e outra dentro de `circle-translator.html`.
 */
import { TRANSLATE_ENDPOINT } from '../config/app.config.js';
import { buildTranslationPrompt } from '../domain/translation.js';

/**
 * @param {string} text palavra ou frase
 * @returns {Promise<string>} tradução
 * @throws {Error} quando o backend responde com erro ou está fora do ar
 */
export async function translateText(text) {
  const response = await fetch(TRANSLATE_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt: buildTranslationPrompt(text) }),
  });
  if (!response.ok) {
    throw new Error(`Erro no servidor: ${response.status} ${response.statusText}`);
  }
  const data = await response.json();
  return String(data.text ?? '').trim();
}
