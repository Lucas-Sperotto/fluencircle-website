/**
 * @file Circle Tradutor (circle-translator.html) — página pública, sem login.
 *
 * Usada nas sessões presenciais: cada tradução feita aqui vira flashcard da
 * sessão que o mediador estiver conduzindo (`current_session`).
 *
 * ATENÇÃO: este frontend ainda tenta salvar cartões diretamente no RTDB
 * sem login. As regras ATIVAS não foram auditadas; o rascunho de regras
 * passa a NEGAR escrita anônima, o que impede salvar até existir backend
 * com controle de sessão, identidade, tamanho e rate limit.
 * A exibição como texto ajuda contra XSS, mas não resolve autorização.
 */
import { watchCurrentSession } from '../services/sessions.service.js';
import { addFlashcard } from '../services/flashcards.service.js';
import { translateText } from '../services/translate.service.js';
import { TRANSLATOR_MAX_LENGTH } from '../config/app.config.js';
import { canSaveTranslationToSession } from '../domain/active-session.js';
import { byId } from '../ui/dom.js';
import { mountEnvironmentBadge } from '../ui/environment-badge.js';

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

  // Salvar o id da aula antes de aguardar o backend assíncrono.
  const originSession = activeSession;
  translateButton.disabled = true;
  translateButton.textContent = 'Traduzindo...';
  clearStatus();
  try {
    const translation = await translateText(text);
    resultInput.value = translation;
    if (originSession && translation) {
      if (!canSaveTranslationToSession(originSession, activeSession)) {
        showStatus('A sessão mudou durante a tradução. O texto não foi salvo como flashcard.', 'warning');
      } else {
        await addFlashcard(originSession.sessionId, {
          front: text,
          back: translation,
          topic: originSession.topic || DEFAULT_TOPIC,
        });
      }
    }
  } catch (error) {
    console.error('Erro no processo:', error);
    showStatus('Ocorreu um erro ao processar. Tente novamente.', 'error');
  } finally {
    translateButton.disabled = false;
    translateButton.textContent = 'Traduzir';
  }
}

mountEnvironmentBadge();
sourceInput.maxLength = TRANSLATOR_MAX_LENGTH;
translateButton.addEventListener('click', handleTranslate);
sourceInput.addEventListener('keydown', (event) => {
  if (event.key === 'Enter') handleTranslate();
});

watchCurrentSession((session) => {
  activeSession = session;
  renderSessionLabel();
});
