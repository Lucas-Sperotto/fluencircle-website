/**
 * @file Sessões (manage-meetings.html): histórico de sessões e edição dos flashcards gerados.
 *
 * Restrito a mediadores e administradores.
 */
import { initProtectedPage } from './shared/page-setup.js';
import { listSessions, deleteSession } from '../services/sessions.service.js';
import { listAllFlashcards, listSessionFlashcards, addFlashcard, updateFlashcard, deleteFlashcard } from '../services/flashcards.service.js';
import { formatDateTime } from '../domain/format.js';
import { STAFF_ROLES } from '../core/roles.js';
import { h, icon, byId, replaceContent, makeActivatable } from '../ui/dom.js';
import { showToast } from '../ui/toast.js';
import { confirmDialog } from '../ui/confirm-dialog.js';

const listView = byId('meetings-list-view');
const editorView = byId('flashcards-editor-view');
const sessionsGrid = byId('manage-meetings-grid');
const editorTitle = byId('selected-meeting-title');
const cardsContainer = byId('cards-editor-container');
const newCardFront = byId('new-card-front');
const newCardBack = byId('new-card-back');
const addCardButton = byId('add-new-card-btn');

/** Sessão aberta no editor: `{ id, ...dados }`. */
let currentSession = null;

const emptyMessage = (text) => h('p', { class: 'empty-state' }, text);

async function loadSessions() {
  replaceContent(sessionsGrid, emptyMessage('Carregando histórico de sessões...'));
  try {
    const [sessions, flashcardsBySession] = await Promise.all([listSessions(), listAllFlashcards()]);
    const ids = Object.keys(sessions).filter((id) => sessions[id]);
    if (ids.length === 0) {
      replaceContent(sessionsGrid, emptyMessage('Nenhuma reunião foi iniciada ainda.'));
      return;
    }
    // Mais recente primeiro; o número no badge conta a partir da mais antiga.
    ids.sort((a, b) => new Date(sessions[b].startedAt || 0) - new Date(sessions[a].startedAt || 0));
    replaceContent(sessionsGrid, ids.map((id, index) => {
      const cardCount = Object.keys(flashcardsBySession[id] || {}).length;
      return renderSessionCard({ id, ...sessions[id] }, ids.length - index, cardCount);
    }));
  } catch (error) {
    console.error('Erro ao carregar sessões:', error);
    replaceContent(sessionsGrid, emptyMessage('Erro ao carregar dados do servidor.'));
  }
}

function renderSessionCard(session, number, cardCount) {
  const topic = session.topic || 'Sessão sem tema';
  const card = h('div', { class: 'manage-meeting-card', title: 'Clique para abrir a configuração desta sessão' },
    h('div', { class: 'manage-meeting-header' },
      h('span', { class: 'meeting-badge' }, String(number)),
      h('div', null,
        h('span', { class: 'manage-meeting-topic' }, topic),
        h('div', { class: 'manage-meeting-date' }, icon('fa-clock', 'regular'), ` ${formatDateTime(session.startedAt)}`))),
    h('div', { class: 'manage-meeting-info' },
      h('span', null, icon('fa-layer-group'), ` ${cardCount} flashcard(s) gerados`),
      h('div', { class: 'manage-meeting-mediator' }, `Mediador: ${session.mediatorEmail || 'Não identificado'}`)));
  return makeActivatable(card, () => openEditor(session), `Abrir sessão ${topic}`);
}

async function openEditor(session) {
  currentSession = session;
  editorTitle.textContent = `${session.topic || 'Sessão'} (${formatDateTime(session.startedAt)})`;
  listView.classList.add('hidden');
  editorView.classList.remove('hidden');
  await loadSessionCards();
}

function backToList() {
  editorView.classList.add('hidden');
  listView.classList.remove('hidden');
  loadSessions();
}

async function loadSessionCards() {
  replaceContent(cardsContainer, emptyMessage('Carregando flashcards da sessão...'));
  try {
    const cards = await listSessionFlashcards(currentSession.id);
    const entries = Object.entries(cards).filter(([, card]) => card);
    if (entries.length === 0) {
      replaceContent(cardsContainer, emptyMessage('Nenhum flashcard foi salvo durante esta sessão. Adicione um acima se desejar!'));
      return;
    }
    replaceContent(cardsContainer, entries.map(([cardId, card], index) => renderCardRow(cardId, card, index)));
  } catch (error) {
    console.error('Erro ao buscar flashcards:', error);
    replaceContent(cardsContainer, emptyMessage('Erro ao carregar flashcards.'));
  }
}

/** Linha editável de um flashcard. Os textos entram por `.value` (aspas não quebram mais o campo). */
function renderCardRow(cardId, card, index) {
  const frontInput = h('input', { type: 'text', class: 'card-edit-front', placeholder: 'Frente (Inglês)', 'aria-label': `Frente do card ${index + 1}` });
  const backInput = h('input', { type: 'text', class: 'card-edit-back', placeholder: 'Verso (Português)', 'aria-label': `Verso do card ${index + 1}` });
  frontInput.value = card.front || '';
  backInput.value = card.back || '';

  // Os espaços (' ') reproduzem o espaçamento que o HTML antigo tinha entre os botões.
  const saveButton = h('button', { type: 'button', class: 'save-single-card-btn', title: 'Salvar alteração neste card', 'aria-label': 'Salvar alteração neste card' }, icon('fa-floppy-disk'), ' ');
  const deleteButton = h('button', { type: 'button', class: 'delete-single-card-btn', title: 'Excluir este card', 'aria-label': 'Excluir este card' }, icon('fa-trash'));

  saveButton.addEventListener('click', async () => {
    const front = frontInput.value.trim();
    const back = backInput.value.trim();
    if (!front || !back) {
      showToast('Preencha os dois lados do flashcard.', 'error');
      return;
    }
    saveButton.disabled = true;
    try {
      await updateFlashcard(currentSession.id, cardId, { front, back });
      showToast('Card atualizado com sucesso!', 'success');
    } catch (error) {
      console.error('Erro ao atualizar card:', error);
      showToast('Falha ao salvar alteração.', 'error');
    } finally {
      saveButton.disabled = false;
    }
  });

  deleteButton.addEventListener('click', async () => {
    const confirmed = await confirmDialog({
      title: 'Excluir Flashcard',
      message: `Deseja remover o card "${card.front}" desta sessão?`,
    });
    if (!confirmed) return;
    try {
      await deleteFlashcard(currentSession.id, cardId);
      showToast('Flashcard removido.', 'success');
      await loadSessionCards();
    } catch (error) {
      console.error('Erro ao excluir card:', error);
      showToast('Erro ao remover o flashcard.', 'error');
    }
  });

  return h('div', { class: 'card-editor-row' },
    h('span', { class: 'card-row-index' }, String(index + 1)),
    h('div', { class: 'card-inputs-group' }, frontInput, backInput),
    h('div', { class: 'card-row-actions' }, saveButton, ' ', deleteButton));
}

async function addCard() {
  const front = newCardFront.value.trim();
  const back = newCardBack.value.trim();
  if (!front || !back) {
    showToast('Informe os dados de frente e verso.', 'error');
    return;
  }
  addCardButton.disabled = true;
  try {
    await addFlashcard(currentSession.id, { front, back, topic: currentSession.topic || '' });
    newCardFront.value = '';
    newCardBack.value = '';
    showToast('Flashcard adicionado à sessão!', 'success');
    await loadSessionCards();
  } catch (error) {
    console.error('Erro ao adicionar card na sessão:', error);
    showToast('Erro ao gravar card.', 'error');
  } finally {
    addCardButton.disabled = false;
  }
}

async function removeSession() {
  if (!currentSession) return;
  const confirmed = await confirmDialog({
    title: 'Excluir Sessão',
    message: `Tem certeza que deseja apagar a sessão "${currentSession.topic || 'Sem tema'}" realizada em ${formatDateTime(currentSession.startedAt)}? Isso removerá os flashcards e o histórico desta sessão.`,
  });
  if (!confirmed) return;
  try {
    await deleteSession(currentSession.id, Object.keys(currentSession.attendees || {}));
    showToast('Sessão e cartões excluídos com sucesso.', 'success');
    backToList();
  } catch (error) {
    console.error('Erro ao excluir sessão:', error);
    showToast('Falha ao excluir sessão.', 'error');
  }
}

byId('back-to-meetings-list-btn').addEventListener('click', backToList);
byId('delete-session-btn').addEventListener('click', removeSession);
addCardButton.addEventListener('click', addCard);

const session = await initProtectedPage({ allowedRoles: STAFF_ROLES, deniedMessage: 'Acesso restrito a Mediadores.' });
if (session) await loadSessions();
