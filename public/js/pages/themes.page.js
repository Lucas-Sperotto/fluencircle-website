/**
 * @file Temas (set-meeting.html): cadastro de tópicos e perguntas de apoio.
 *
 * Restrito a mediadores e administradores. Duas visões na mesma página:
 * a grade de temas e o editor (criar/editar/excluir).
 */
import { initProtectedPage } from './shared/page-setup.js';
import { listThemes, createTheme, updateTheme, deleteTheme } from '../services/themes.service.js';
import { toQuestionList } from '../domain/questions.js';
import { STAFF_ROLES } from '../core/roles.js';
import { h, icon, byId, replaceContent, makeActivatable, setBusy } from '../ui/dom.js';
import { showToast } from '../ui/toast.js';
import { confirmDialog } from '../ui/confirm-dialog.js';

const listView = byId('themes-list-view');
const editorView = byId('theme-editor-view');
const themesGrid = byId('themes-grid');
const editorTitle = byId('editor-title');
const editorSubtitle = byId('editor-subtitle');
const topicInput = byId('topic-input');
const questionList = byId('questions-list');
const saveButton = byId('set-button');
const deleteButton = byId('editor-delete-theme-btn');

/** Id do tema em edição; null quando é um tema novo. */
let editingId = null;
let editingTopic = '';

async function loadThemes() {
  replaceContent(themesGrid, h('p', { class: 'empty-state' }, 'Carregando temas...'));
  try {
    const themes = await listThemes();
    const entries = Object.entries(themes).filter(([, theme]) => theme);
    if (entries.length === 0) {
      replaceContent(themesGrid, h('p', { class: 'empty-state' }, 'Nenhum tema de conversação cadastrado ainda.'));
      return;
    }
    replaceContent(themesGrid, entries.map(([id, theme], index) => renderThemeCard(id, theme, index)));
  } catch (error) {
    console.error('Erro ao buscar temas:', error);
    replaceContent(themesGrid, h('p', { class: 'empty-state' }, 'Erro ao carregar banco de dados.'));
  }
}

function renderThemeCard(id, theme, index) {
  const topic = theme.topic || 'Sem tema';
  const card = h('div', { class: 'manage-theme-card' },
    h('div', { class: 'manage-meeting-header' },
      h('span', { class: 'meeting-badge' }, String(index + 1)),
      h('span', { class: 'manage-meeting-topic' }, topic)));
  return makeActivatable(card, () => openEditor(id, theme), `Editar tema ${topic}`);
}

/** Acrescenta um campo de pergunta. O texto vai por `.value`, então aspas não quebram mais o campo. */
function addQuestionCard(initialText = '') {
  const input = h('input', { type: 'text', class: 'new-question-input', placeholder: 'Digite sua pergunta em inglês...', 'aria-label': 'Pergunta' });
  input.value = initialText;
  const card = h('div', { class: 'question-card' },
    h('span', { class: 'questionNumber' }, '0'),
    input,
    h('button', { type: 'button', class: 'delete-question-btn', title: 'Remover pergunta', 'aria-label': 'Remover pergunta' }, icon('fa-trash')));

  card.querySelector('.delete-question-btn').addEventListener('click', () => {
    card.remove();
    renumberQuestions();
  });
  questionList.append(card);
  renumberQuestions();
  if (!initialText) input.focus();
}

function renumberQuestions() {
  questionList.querySelectorAll('.question-card').forEach((card, index) => {
    card.querySelector('.questionNumber').textContent = String(index + 1);
  });
}

/**
 * Abre o editor. Sem `id`, prepara um tema novo com um campo de pergunta vazio.
 * @param {string|null} id
 * @param {object|null} theme
 */
function openEditor(id = null, theme = null) {
  editingId = id;
  questionList.replaceChildren();

  if (id && theme) {
    editingTopic = theme.topic || 'este tema';
    editorTitle.textContent = 'Editar Tema';
    editorSubtitle.textContent = 'Modifique o título ou adicione/remova perguntas de apoio.';
    topicInput.value = theme.topic || '';
    deleteButton.classList.remove('hidden');
    toQuestionList(theme.questions).forEach((question) => addQuestionCard(question));
  } else {
    editingTopic = '';
    editorTitle.textContent = 'Novo Tema';
    editorSubtitle.textContent = 'Defina o título do tópico e insira as perguntas condutoras.';
    topicInput.value = '';
    deleteButton.classList.add('hidden');
    addQuestionCard();
  }

  listView.classList.add('hidden');
  editorView.classList.remove('hidden');
  topicInput.focus();
}

function closeEditor() {
  editorView.classList.add('hidden');
  listView.classList.remove('hidden');
  loadThemes();
}

function flagInvalid(input) {
  input.classList.add('danger-input');
  setTimeout(() => input.classList.remove('danger-input'), 2000);
}

async function saveTheme() {
  const topic = topicInput.value.trim();
  if (!topic) {
    showToast('Adicione o título do tema!', 'error');
    flagInvalid(topicInput);
    return;
  }
  const questions = Array.from(questionList.querySelectorAll('.new-question-input'), (input) => input.value.trim()).filter(Boolean);
  if (questions.length === 0) {
    showToast('Adicione pelo menos 1 pergunta para a conversa!', 'error');
    return;
  }

  const restore = setBusy(saveButton, 'Salvando...');
  try {
    if (editingId) {
      await updateTheme(editingId, { topic, questions });
      showToast('Tema atualizado com sucesso!', 'success');
    } else {
      await createTheme({ topic, questions });
      showToast('Novo tema criado com sucesso!', 'success');
    }
    closeEditor();
  } catch (error) {
    console.error('Erro ao salvar tema:', error);
    showToast('Falha ao salvar no banco de dados.', 'error');
  } finally {
    restore();
  }
}

async function removeTheme() {
  if (!editingId) return;
  const name = editingTopic || topicInput.value.trim() || 'este tema';
  const confirmed = await confirmDialog({
    title: 'Excluir Tema',
    message: `Tem certeza de que deseja excluir o tema "${name}"?`,
  });
  if (!confirmed) return;
  try {
    await deleteTheme(editingId);
    showToast('Tema excluído com sucesso.', 'success');
    closeEditor();
  } catch (error) {
    console.error('Erro ao excluir tema:', error);
    showToast('Erro ao remover tema.', 'error');
  }
}

byId('open-create-theme-btn').addEventListener('click', () => openEditor());
byId('back-to-themes-btn').addEventListener('click', closeEditor);
byId('cancel-theme-btn').addEventListener('click', closeEditor);
byId('add-question-button').addEventListener('click', () => addQuestionCard());
saveButton.addEventListener('click', saveTheme);
deleteButton.addEventListener('click', removeTheme);

const session = await initProtectedPage({ allowedRoles: STAFF_ROLES, deniedMessage: 'Acesso restrito a Mediadores.' });
if (session) await loadThemes();
