/**
 * @file Sessão ao vivo (presentation.html): escolher tema, conduzir os slides,
 * marcar presença e criar flashcards com o tradutor.
 *
 * Restrito a mediadores e administradores. Fluxo:
 *   seleção do tema → "Iniciar" (cria a sessão e a publica para o tradutor público)
 *   → slides em tela cheia → "Encerrar" (despublica e volta à seleção).
 */
import { initProtectedPage } from '../shared/page-setup.js';
import { createSession, publishCurrentSession } from '../../services/sessions.service.js';
import { STAFF_ROLES } from '../../core/roles.js';
import { byId } from '../../ui/dom.js';
import { showToast } from '../../ui/toast.js';
import { confirmDialog } from '../../ui/confirm-dialog.js';
import { setPresentationMode } from '../../ui/app-shell.js';
import { createThemePicker } from './theme-picker.js';
import { createSlideDeck } from './slides.js';
import { createAttendance } from './attendance.js';
import { createTranslatorModal } from './translator-modal.js';

const selectView = document.querySelector('.select-content');
const slideView = document.querySelector('.slide-content');
const startButton = byId('start-presentation-btn');
const floatingButtons = [byId('open-translator-btn'), byId('open-attendance-btn')];

/** Estado da tela. */
const state = {
  /** @type {import('./theme-picker.js').SelectedTheme | null} */
  selectedTheme: null,
  /** @type {{ id: string, topic: string } | null} sessão em andamento */
  activeSession: null,
  /** @type {(() => Promise<void>) | null} encerra a publicação em current_session */
  unpublish: null,
  mediatorEmail: '',
};

// Evita clique repetido enquanto uma operação assíncrona está em andamento.
let isStarting = false;
let isEnding = false;

const slides = createSlideDeck(document.querySelector('.slide'));
const attendance = createAttendance(() => state.activeSession?.id || '');
const translator = createTranslatorModal(() => state.activeSession);
const themePicker = createThemePicker({
  trigger: byId('presentation-select'),
  list: byId('option-list'),
  valueText: byId('value'),
  loader: byId('themes-loader'),
}, (theme) => {
  state.selectedTheme = theme;
  setStartEnabled(true);
});

function setStartEnabled(enabled) {
  startButton.classList.toggle('unclickable', !enabled);
  startButton.setAttribute('aria-disabled', String(!enabled));
  startButton.disabled = !enabled;
}

function showSessionUI(active) {
  selectView.classList.toggle('hidden', active);
  slideView.classList.toggle('hidden', !active);
  floatingButtons.forEach((button) => button.classList.toggle('hidden', !active));
  setPresentationMode(active);
}

async function startSession() {
  if (!state.selectedTheme || state.activeSession || isStarting || isEnding) return;
  isStarting = true;
  const { id: templateId, topic, questions } = state.selectedTheme;

  setStartEnabled(false);
  startButton.textContent = 'Iniciando...';
  try {
    const sessionId = await createSession({ templateId, topic, mediatorEmail: state.mediatorEmail || 'mediador' });
    const unpublish = await publishCurrentSession({ sessionId, topic });
    state.activeSession = { id: sessionId, topic };
    state.unpublish = unpublish;

    attendance.reset();
    showSessionUI(true);
    slides.start(topic, questions);
    showToast('Sessão iniciada', 'success');
  } catch (error) {
    console.error('Erro ao registrar sessão:', error);
    showToast('Falha ao iniciar evento no banco.', 'error');
  } finally {
    isStarting = false;
    setStartEnabled(!state.activeSession && Boolean(state.selectedTheme));
    startButton.textContent = 'Iniciar';
  }
}

async function endSession() {
  if (!state.activeSession || isEnding || isStarting) return;
  isEnding = true;
  try {
    const confirmed = await confirmDialog({
      title: 'Encerrar sessão',
      message: 'Tem certeza de que deseja finalizar esta sessão de conversação?',
      detail: 'Todos os flashcards criados durante a sessão já estão salvos para os participantes.',
      confirmText: 'Sim, Encerrar',
      cancelText: 'Continuar sessão',
      showCloseButton: true,
    });
    if (!confirmed) return;

    // Erro de despublicação não é sucesso. Preservamos a sessão na tela
    // para que o mediador possa tentar novamente sem deixar um evento órfão.
    if (!state.unpublish) throw new Error('Função de despublicação indisponível.');
    await state.unpublish();
    state.activeSession = null;
    state.unpublish = null;

    attendance.close();
    translator.close();
    showSessionUI(false);
    showToast('Sessão encerrada', 'success');
  } catch (error) {
    console.error('Não foi possível retirar a sessão ativa do banco:', error);
    showToast('Falha ao encerrar no banco. Confira a conexão e tente novamente.', 'error');
  } finally {
    isEnding = false;
  }
}

/** Navegação pelos slides só vale com a sessão na tela e sem modal/gaveta abertos. */
function canNavigate() {
  return !slideView.classList.contains('hidden') && !translator.isOpen() && !attendance.isOpen()
    && !document.querySelector('.modal--confirm');
}

startButton.addEventListener('click', startSession);
byId('end-meeting-btn').addEventListener('click', (event) => {
  event.stopPropagation();
  endSession();
});

window.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') {
    themePicker.close();
    attendance.close();
    return;
  }
  if (!canNavigate()) return;
  if (event.key === 'ArrowRight' || event.key === ' ') {
    event.preventDefault();
    slides.next();
  } else if (event.key === 'ArrowLeft') {
    slides.previous();
  }
});

// Clique na metade direita avança; na esquerda, volta. O cursor mostra a direção.
slideView.addEventListener('click', (event) => {
  if (event.target.closest('.back-button, .translation-button, .attendance-toggle-btn, .attendance-drawer')) return;
  if (event.clientX > window.innerWidth / 2) slides.next();
  else slides.previous();
});
slideView.addEventListener('mousemove', (event) => {
  const isLeft = event.clientX < window.innerWidth / 2;
  slideView.classList.toggle('cursor-left', isLeft);
  slideView.classList.toggle('cursor-right', !isLeft);
});

const session = await initProtectedPage({ allowedRoles: STAFF_ROLES, deniedMessage: 'Acesso restrito a Mediadores.' });
if (session) {
  state.mediatorEmail = session.user.email;
  await Promise.all([themePicker.load(), attendance.loadStudents()]);
}
