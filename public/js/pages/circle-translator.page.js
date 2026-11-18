/**
 * @file Circle Tradutor (circle-translator.html) — página pública, sem login.
 *
 * Usada nas sessões presenciais: cada tradução feita aqui vira flashcard da
 * sessão que o mediador estiver conduzindo (`current_session`).
 *
 * ATENÇÃO (docs/AUDITORIA.md, achado crítico): para isso funcionar sem login,
 * o banco aceita gravação anônima em `flashcards`. Enquanto as regras e o
 * backend não forem ajustados, todas as telas exibem os textos de forma segura
 * (sem `innerHTML`), o que neutraliza o risco de script injetado.
 */
import { watchCurrentSession } from '../services/sessions.service.js';
import { addFlashcard } from '../services/flashcards.service.js';
import { translateText } from '../services/translate.service.js';
import { TRANSLATOR_MAX_LENGTH } from '../config/app.config.js';
import { byId } from '../ui/dom.js';

/** Tema gravado no flashcard quando a sessão ativa não informa um. */
const DEFAULT_TOPIC = 'Circle Tradutor';

const sourceInput = byId('sourceText');
const resultInput = byId('targetText');
const translateButton = byId('translateBtn');
const statusMessage = byId('statusMessage');
const sessionLabel = byId('sessionName');

/** Sessão em andamento, atualizada em tempo real. */
let activeSession = null;

/**
 * @param {string} text
 * @param {'info'|'success'|'warning'|'error'} type
 */
function showStatus(text, type = 'info') {
  statusMessage.textContent = text;
  statusMessage.className = `status-message ${type}`;
}

function clearStatus() {
  statusMessage.textContent = '';
  statusMessage.className = 'status-message';
}

function renderSessionLabel() {
  sessionLabel.textContent = activeSession ? `Sessão ativa: ${activeSession.topic}` : 'Nenhuma sessão ativa no momento';
  sessionLabel.classList.toggle('session-label--active', Boolean(activeSession));
}

async function handleTranslate() {
  const text = sourceInput.value.trim();
  if (!text) {
    showStatus('Por favor, digite uma palavra ou frase.', 'warning');
    return;
  }

  translateButton.disabled = true;
  translateButton.textContent = 'Traduzindo...';
  clearStatus();
  try {
    const translation = await translateText(text);
    resultInput.value = translation;
    if (activeSession && translation) {
      await addFlashcard(activeSession.sessionId, {
        front: text,
        back: translation,
        topic: activeSession.topic || DEFAULT_TOPIC,
      });
    }
  } catch (error) {
    console.error('Erro no processo:', error);
    showStatus('Ocorreu um erro ao processar. Tente novamente.', 'error');
  } finally {
    translateButton.disabled = false;
    translateButton.textContent = 'Traduzir';
  }
}

sourceInput.maxLength = TRANSLATOR_MAX_LENGTH;
translateButton.addEventListener('click', handleTranslate);
sourceInput.addEventListener('keydown', (event) => {
  if (event.key === 'Enter') handleTranslate();
});

watchCurrentSession((session) => {
  activeSession = session;
  renderSessionLabel();
});
