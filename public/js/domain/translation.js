/**
 * @file Prompt de tradução enviado ao Gemini (função pura).
 *
 * Antes havia duas cópias divergentes deste texto (apresentação e tradutor público).
 * Esta é a versão unificada, com a regra 7 e sem a palavra repetida.
 *
 * Recomendação pendente (docs/AUDITORIA.md): mover o prompt para o backend e
 * enviar só o texto, para que ninguém consiga usar o endpoint com outro prompt.
 */

/**
 * @param {string} text palavra ou frase digitada pelo usuário
 * @returns {string} prompt completo
 */
export function buildTranslationPrompt(text) {
  return `Você é um tradutor bidirecional estrito (Inglês ⇄ Português).
Detecte o idioma do texto de entrada e traduza para o outro idioma.

REGRAS OBRIGATÓRIAS:
1. Se o texto estiver em INGLÊS, retorne SOMENTE a tradução em PORTUGUÊS.
2. Se o texto estiver em PORTUGUÊS, retorne SOMENTE a tradução em INGLÊS.
3. NUNCA misture os dois idiomas na resposta e NUNCA repita o texto original.
4. Para palavras únicas com múltiplas traduções, forneça no máximo 3 opções separadas por barra (Ex: "estressante / irritante").
5. Para frases, forneça uma única tradução natural que faça sentido no contexto, sem repetir a frase de entrada.
6. Retorne APENAS o texto da tradução, absolutamente nenhuma palavra a mais, pontuação extra ou explicação.
7. NUNCA retorne o mesmo idioma da entrada.

Exemplo 1:
Entrada: annoying
Saída: estressante / irritante

Exemplo 2:
Entrada: cachorro
Saída: dog

Texto a ser traduzido: ${text}`;
}
