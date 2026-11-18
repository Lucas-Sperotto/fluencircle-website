/**
 * @file Seletor de tema da tela "Iniciar sessão" (lista suspensa personalizada).
 */
import { listThemes } from '../../services/themes.service.js';
import { toQuestionList } from '../../domain/questions.js';
import { truncate } from '../../domain/format.js';
import { h, replaceContent } from '../../ui/dom.js';
import { toggleDropdown } from '../../ui/dropdown.js';

const LABEL_MAX_LENGTH = 40;

/**
 * @typedef {{ id: string, topic: string, questions: string[] }} SelectedTheme
 */

/**
 * @param {Object} elements
 * @param {HTMLElement} elements.trigger caixa clicável (#presentation-select)
 * @param {HTMLElement} elements.list lista de opções (#option-list)
 * @param {HTMLElement} elements.valueText texto do tema escolhido (#value)
 * @param {HTMLElement} elements.loader indicador de carregamento dentro da caixa
 * @param {(theme: SelectedTheme) => void} onSelect
 */
export function createThemePicker({ trigger, list, valueText, loader }, onSelect) {
  const isOpen = () => !list.classList.contains('hidden');
  const syncExpanded = () => trigger.setAttribute('aria-expanded', String(isOpen()));

  function close() {
    list.classList.add('hidden');
    syncExpanded();
  }

  function choose(id, theme) {
    const selected = {
      id,
      topic: theme.topic || 'Sem tema',
      questions: toQuestionList(theme.questions),
    };
    valueText.textContent = selected.topic;
    close();
    onSelect(selected);
  }

  function renderOption(id, theme, index) {
    const label = theme.topic || `Sessão ${index + 1}`;
    const option = h('div', { class: 'meeting-option', role: 'option', tabindex: '0', dataset: { value: id } },
      `${index + 1} — ${truncate(label, LABEL_MAX_LENGTH)}`);
    const select = (event) => {
      event.stopPropagation();
      choose(id, theme);
      trigger.focus();
    };
    option.addEventListener('click', select);
    option.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        select(event);
      }
    });
    return option;
  }

  async function load() {
    loader?.classList.remove('hidden');
    try {
      const themes = await listThemes();
      const entries = Object.entries(themes).filter(([, theme]) => theme);
      if (entries.length === 0) {
        valueText.textContent = 'Nenhum tema cadastrado.';
        return;
      }
      replaceContent(list, entries.map(([id, theme], index) => renderOption(id, theme, index)));
    } catch (error) {
      console.error('Erro ao buscar temas:', error);
      valueText.textContent = 'Erro ao carregar sessões.';
    } finally {
      loader?.classList.add('hidden');
    }
  }

  function toggle() {
    toggleDropdown(trigger, list, 'bottom');
    syncExpanded();
    if (isOpen()) list.querySelector('.meeting-option')?.focus();
  }

  trigger.addEventListener('click', (event) => {
    if (event.target.closest('.meeting-option')) return;
    toggle();
  });
  trigger.addEventListener('keydown', (event) => {
    if (event.target !== trigger) return;
    if (event.key === 'Enter' || event.key === ' ' || event.key === 'ArrowDown') {
      event.preventDefault();
      toggle();
    }
  });
  document.addEventListener('click', (event) => {
    if (isOpen() && !trigger.contains(event.target) && !list.contains(event.target)) close();
  });

  return { load, close, isOpen };
}
