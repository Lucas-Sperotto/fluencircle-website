/**
 * @file Lista de presença da sessão ao vivo (gaveta lateral "Participantes").
 */
import { listStudents } from '../../services/users.service.js';
import { addAttendee, removeAttendee } from '../../services/sessions.service.js';
import { displayName, sortUsersByName, filterUsers } from '../../domain/users.js';
import { h, icon, byId, replaceContent } from '../../ui/dom.js';
import { showToast } from '../../ui/toast.js';

/** Na lista de presença, aluno sem nome aparece com o e-mail inteiro. */
const NAME_OPTIONS = Object.freeze({ emailMode: 'full', fallback: 'Aluno' });

/**
 * @param {() => string} getSessionId devolve o id da sessão ativa ('' se nenhuma)
 */
export function createAttendance(getSessionId) {
  const drawer = byId('attendance-drawer');
  const openButton = byId('open-attendance-btn');
  const closeButton = byId('close-attendance-btn');
  const trigger = byId('student-select-trigger');
  const optionsList = byId('student-options-list');
  const searchInput = byId('attendance-search-bar');
  const attendeesList = byId('attendees-list');
  const countBadge = byId('attendance-count-badge');

  let students = [];
  /** @type {Record<string, { name: string, email: string }>} */
  let attendees = {};

  const isDrawerOpen = () => !drawer.classList.contains('hidden');
  const setOptionsOpen = (open) => {
    optionsList.classList.toggle('hidden', !open);
    searchInput.setAttribute('aria-expanded', String(open));
  };

  function renderOptions() {
    if (students.length === 0) {
      replaceContent(optionsList, h('div', { class: 'custom-select-option custom-select-option--muted' }, 'Nenhum aluno cadastrado.'));
      return;
    }
    const visible = filterUsers(sortUsersByName(students, NAME_OPTIONS), searchInput.value, NAME_OPTIONS);
    if (visible.length === 0) {
      replaceContent(optionsList, h('div', { class: 'custom-select-option custom-select-option--muted' }, 'Nenhum aluno encontrado.'));
      return;
    }
    replaceContent(optionsList, visible.map((student) => {
      const name = displayName(student, NAME_OPTIONS);
      const added = Boolean(attendees[student.uid]);
      const option = h('div', { class: `custom-select-option${added ? ' already-added' : ''}`, role: 'option', tabindex: '0', 'aria-selected': String(added) },
        h('span', null, name),
        added && h('i', { class: 'fa-solid fa-check custom-select-option__check', 'aria-hidden': 'true' }));
      const pick = (event) => {
        event.stopPropagation();
        if (added) return;
        add(student.uid, name, student.email || '');
        setOptionsOpen(false);
        searchInput.value = '';
        renderOptions();
      };
      option.addEventListener('click', pick);
      option.addEventListener('keydown', (event) => { if (event.key === 'Enter') pick(event); });
      return option;
    }));
  }

  function renderAttendees() {
    const uids = Object.keys(attendees);
    countBadge.textContent = String(uids.length);
    if (uids.length === 0) {
      replaceContent(attendeesList, h('p', { class: 'empty-state empty-state--compact' }, 'Nenhum aluno adicionado ainda.'));
      return;
    }
    replaceContent(attendeesList, uids.map((uid) => {
      const { name, email } = attendees[uid];
      const removeButton = h('button', { type: 'button', class: 'remove-attendee-btn', title: 'Remover presença', 'aria-label': `Remover presença de ${name}` }, icon('fa-xmark'));
      removeButton.addEventListener('click', (event) => {
        event.stopPropagation();
        remove(uid, name);
      });
      return h('div', { class: 'attendee-item' },
        h('div', { class: 'attendee-info' }, h('span', { class: 'attendee-name' }, name), h('span', { class: 'attendee-email' }, email)),
        removeButton);
    }));
  }

  async function add(uid, name, email) {
    const sessionId = getSessionId();
    if (!sessionId) return;
    try {
      await addAttendee(sessionId, uid, { name, email });
      attendees[uid] = { name, email };
      renderAttendees();
      renderOptions();
      showToast(`${name} adicionado à lista de presença!`, 'success');
    } catch (error) {
      console.error('Erro ao registrar presença:', error);
      showToast('Falha ao salvar presença.', 'error');
    }
  }

  async function remove(uid, name) {
    const sessionId = getSessionId();
    if (!sessionId) return;
    try {
      await removeAttendee(sessionId, uid);
      delete attendees[uid];
      renderAttendees();
      renderOptions();
      showToast(`${name} removido da presença.`, 'success');
    } catch (error) {
      console.error('Erro ao remover presença:', error);
      showToast('Falha ao remover presença.', 'error');
    }
  }

  function closeDrawer() {
    drawer.classList.add('hidden');
    setOptionsOpen(false);
  }

  openButton.addEventListener('click', (event) => {
    event.stopPropagation();
    drawer.classList.toggle('hidden');
  });
  closeButton.addEventListener('click', (event) => {
    event.stopPropagation();
    closeDrawer();
  });
  trigger.addEventListener('click', (event) => {
    event.stopPropagation();
    setOptionsOpen(optionsList.classList.contains('hidden'));
  });
  searchInput.addEventListener('input', () => {
    renderOptions();
    setOptionsOpen(true);
  });
  searchInput.addEventListener('click', (event) => {
    event.stopPropagation();
    setOptionsOpen(true);
    renderOptions();
  });
  // Clique fora fecha a lista de alunos e a gaveta.
  document.addEventListener('click', (event) => {
    if (!optionsList.contains(event.target) && !trigger.contains(event.target)) setOptionsOpen(false);
    if (isDrawerOpen() && !drawer.contains(event.target) && !openButton.contains(event.target)) closeDrawer();
  });

  return {
    /** Carrega os alunos cadastrados (para a busca). */
    async loadStudents() {
      try {
        students = await listStudents();
        renderOptions();
      } catch (error) {
        console.error('Erro ao buscar alunos para presença:', error);
      }
    },
    /** Zera a presença para uma nova sessão. */
    reset() {
      attendees = {};
      renderAttendees();
      renderOptions();
    },
    isOpen: isDrawerOpen,
    close: closeDrawer,
  };
}
