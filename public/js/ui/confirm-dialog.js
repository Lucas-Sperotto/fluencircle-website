/**
 * @file Diálogo de confirmação reutilizável.
 *
 * Substitui os três modais de exclusão quase iguais que existiam (acessos,
 * temas e sessões) e o de encerrar sessão. Fecha com Esc, com "Cancelar" ou
 * clicando fora; o foco começa em "Cancelar", a opção segura.
 */
import { h, icon } from './dom.js';

let dialogCount = 0;

/**
 * @param {Object} options
 * @param {string} options.title
 * @param {string} options.message
 * @param {string} [options.detail] linha secundária, em fonte menor
 * @param {string} [options.confirmText]
 * @param {string} [options.cancelText]
 * @param {boolean} [options.showCloseButton] mostra o "X" no canto
 * @returns {Promise<boolean>} true se confirmou
 */
export function confirmDialog({
  title,
  message,
  detail = '',
  confirmText = 'Excluir',
  cancelText = 'Cancelar',
  showCloseButton = false,
}) {
  return new Promise((resolve) => {
    const titleId = `confirm-dialog-title-${++dialogCount}`;
    const previouslyFocused = document.activeElement;

    const close = (confirmed) => {
      document.removeEventListener('keydown', onKeydown);
      container.remove();
      if (previouslyFocused instanceof HTMLElement) previouslyFocused.focus();
      resolve(confirmed);
    };
    const onKeydown = (event) => {
      if (event.key === 'Escape') close(false);
    };

    const cancelButton = h('button', { type: 'button', class: 'secondary-btn', 'data-action': 'cancel', onclick: () => close(false) }, cancelText);
    const confirmButton = h('button', { type: 'button', class: 'danger-btn', 'data-action': 'confirm', onclick: () => close(true) }, confirmText);

    const modal = h('div', { class: 'modal modal--confirm', role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': titleId },
      showCloseButton && h('button', { type: 'button', class: 'close-end-meeting-btn', 'aria-label': 'Fechar', onclick: () => close(false) }, icon('fa-x')),
      h('div', { class: 'modal-content' },
        h('h3', { id: titleId }, title),
        h('p', null, message),
        detail && h('p', { class: 'modal-sub-info' }, detail),
        h('div', { class: 'flexbox' }, cancelButton, confirmButton)));

    const container = h('div', { class: 'modal-container' }, modal);
    container.addEventListener('click', (event) => {
      if (!event.target.closest('.modal')) close(false);
    });

    document.addEventListener('keydown', onKeydown);
    document.body.append(container);
    cancelButton.focus();
  });
}
