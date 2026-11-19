/**
 * @file Flashcards (flash-cards.html): lista de decks por sessão e modo de estudo.
 *
 * Aluno vê as sessões em que esteve presente; mediador e administrador veem todas.
 * Sessões sem flashcards não aparecem. Ao terminar a pilha, a etapa de revisão
 * espaçada avança se estiver liberada (domain/srs.js).
 */
import { initProtectedPage } from './shared/page-setup.js';
import { listSessions } from '../services/sessions.service.js';
import { listAllFlashcards } from '../services/flashcards.service.js';
import { getStudentReviews, saveReviewProgress } from '../services/reviews.service.js';
import { calculateSRSStatus, canAdvanceStage, buildStageCompletion, FINAL_STAGE, STAGE_COMPLETION_MESSAGES } from '../domain/srs.js';
import { formatDate, nowIso } from '../domain/format.js';
import { isStaff } from '../core/roles.js';
import { h, icon, byId, replaceContent, makeActivatable } from '../ui/dom.js';
import { showToast } from '../ui/toast.js';
import { setPageLoading } from '../ui/loader.js';
import { CardStack } from '../ui/card-stack.js';

const listView = byId('meetings-content');
const studyView = byId('flash-cards-content');
const sessionsGrid = byId('sessions-grid');
const studyTitle = byId('current-meeting-title');
const studyControls = document.querySelector('.flash-cards-study-content');

/** @type {{ uid: string } | null} */
let currentUser = null;
let currentRole = null;
/** Deck aberto no modo de estudo. */
let studiedDeck = null;

const cardStack = new CardStack({
  container: byId('flash-cards-container'),
  progressBar: byId('progress-bar'),
  onFinish: () => handleDeckFinished(),
  onExit: () => showList(),
});

/**
 * Busca sessões, cards e progresso e monta a lista de decks visíveis para o usuário.
 * @returns {Promise<object[]|null>} decks, ou null se não houver nenhuma sessão
 */
async function loadDecks() {
  const [sessions, flashcardsBySession, reviews] = await Promise.all([
    listSessions(),
    listAllFlashcards(),
    getStudentReviews(currentUser.uid),
  ]);
  if (Object.keys(sessions).length === 0) return null;

  const decks = [];
  for (const [id, session] of Object.entries(sessions)) {
    const cards = flashcardsBySession[id];
    if (!session || !cards || Object.keys(cards).length === 0) continue;
    const attended = Boolean(session.attendees?.[currentUser.uid]);
    if (!isStaff(currentRole) && !attended) continue;
    const review = reviews[id];
    decks.push({ id, ...session, cards, review, srs: calculateSRSStatus(session, review) });
  }

  // Revisões pendentes primeiro; depois, as sessões mais recentes.
  return decks.sort((a, b) => {
    if (a.srs.isDue !== b.srs.isDue) return a.srs.isDue ? -1 : 1;
    return new Date(b.startedAt || 0) - new Date(a.startedAt || 0);
  });
}

function renderStage(number, label, srs) {
  const completed = srs.stage >= number;
  const dueNow = srs.stage === number - 1 && srs.isDue;
  return h('div', { class: `srs-stage-step ${completed ? 'completed' : dueNow ? 'active-due' : ''}`.trim() },
    h('div', { class: 'srs-stage-circle' }, completed ? '✓' : String(number)),
    h('span', null, label));
}

function renderBadge(srs) {
  if (srs.progressPercent === 100) return h('span', { class: 'srs-mastery-badge srs-badge-mastered' }, ' Concluído');
  if (srs.isDue) return h('span', { class: 'srs-mastery-badge srs-badge-due' }, ' Revisão pendente');
  return h('span', { class: 'srs-mastery-badge srs-badge-waiting' }, ' ', icon('fa-clock-rotate-left'), ` ${srs.timeRemainingText}`);
}

function renderDeckCard(deck) {
  const topic = deck.topic || 'Sessão de Conversação';
  const card = h('div', { class: 'srs-meeting-card' },
    h('div', { class: 'srs-card-top' }, h('span', { class: 'srs-card-topic' }, topic), renderBadge(deck.srs)),
    h('div', { class: 'srs-stages-timeline' },
      renderStage(1, '1 Dia', deck.srs),
      renderStage(2, '7 Dias', deck.srs),
      renderStage(3, '30 Dias', deck.srs)),
    h('div', { class: 'srs-card-footer' },
      h('span', null, icon('fa-layer-group'), ` ${Object.keys(deck.cards).length}`),
      h('span', null, icon('fa-clock', 'regular'), ` ${formatDate(deck.startedAt)}`)));
  return makeActivatable(card, () => openStudyMode(deck), `Estudar ${topic}`);
}

function renderEmptyDecks() {
  return h('div', { class: 'empty-state empty-state--decks' },
    h('i', { class: 'fa-solid fa-graduation-cap empty-state__icon', 'aria-hidden': 'true' }),
    h('p', null, 'Nenhum deck de flashcards disponível no momento.'),
    h('span', { class: 'empty-state__hint' },
      'Assim que novos vocabulários forem registrados durante as suas aulas, seus flashcards aparecerão aqui!'));
}

async function renderDeckList() {
  setPageLoading(true);
  sessionsGrid.replaceChildren();
  try {
    const decks = await loadDecks();
    if (decks === null) {
      replaceContent(sessionsGrid, h('p', { class: 'empty-state' }, 'Nenhuma sessão de conversação foi realizada ainda.'));
    } else if (decks.length === 0) {
      replaceContent(sessionsGrid, renderEmptyDecks());
    } else {
      replaceContent(sessionsGrid, decks.map(renderDeckCard));
    }
  } catch (error) {
    console.error('Erro ao carregar sessões de flashcards:', error);
    replaceContent(sessionsGrid, h('p', { class: 'empty-state' }, 'Erro ao conectar com o banco de dados.'));
  } finally {
    setPageLoading(false);
  }
}

function openStudyMode(deck) {
  studiedDeck = deck;
  const cards = Array.isArray(deck.cards) ? deck.cards : Object.values(deck.cards || {});
  listView.classList.add('hidden');
  studyView.classList.remove('hidden');
  studyTitle.textContent = deck.topic || 'Sessão';

  if (cards.length === 0) {
    studyControls?.classList.add('hidden');
    replaceContent(byId('flash-cards-container'), h('p', { class: 'empty-state empty-state--study' }, 'Nenhum flashcard cadastrado para esta aula.'));
    return;
  }
  studyControls?.classList.remove('hidden');
  cardStack.load(cards);
}

function showList() {
  studyView.classList.add('hidden');
  listView.classList.remove('hidden');
  byId('flash-cards-container').replaceChildren();
  byId('progress-bar').replaceChildren();
  renderDeckList(); // atualiza o progresso de cada deck
}

/** Fim da pilha: avança a etapa de revisão quando ela está liberada. */
async function handleDeckFinished() {
  if (!studiedDeck || !currentUser) return;
  const { srs } = studiedDeck;

  if (canAdvanceStage(srs)) {
    const record = buildStageCompletion(srs.stage, nowIso());
    try {
      await saveReviewProgress(currentUser.uid, studiedDeck.id, record);
      studiedDeck.review = { ...studiedDeck.review, ...record };
      studiedDeck.srs = calculateSRSStatus(studiedDeck, studiedDeck.review);
      showToast(STAGE_COMPLETION_MESSAGES[record.stage] || 'Etapa concluída com sucesso!', 'success');
    } catch (error) {
      console.error('Erro ao registrar avanço na curva de esquecimento:', error);
      showToast('Não foi possível salvar seu progresso. Tente de novo.', 'error');
    }
  } else if (srs.invalidState) {
    showToast('Progresso com dados inválidos. Não foi alterado; contate o suporte.', 'error');
  } else if (srs.stage >= FINAL_STAGE) {
    showToast('Revisão concluída! Vocabulário 100% consolidado.', 'success');
  } else {
    showToast(`Revisão concluída! Próximo marco em ${srs.timeRemainingText}.`, 'info');
  }
}

byId('back-to-meetings-btn').addEventListener('click', showList);
byId('restart-cards-btn').addEventListener('click', () => cardStack.restart());
byId('previousCard').addEventListener('click', () => cardStack.previous());

const session = await initProtectedPage();
if (session) {
  currentUser = session.user;
  currentRole = session.role;
  await renderDeckList();
}
