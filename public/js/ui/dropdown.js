/**
 * @file Abre e posiciona uma lista suspensa (dropdown) ao lado de um elemento.
 *
 * Correções em relação à versão antiga (`app.js`):
 * - a validação `!x instanceof HTMLElement` nunca disparava (precedência); agora é `!(x instanceof …)`;
 * - as posições `left` e `top` usavam a conta errada; agora partem do tamanho da janela;
 * - posições de aberturas anteriores são limpas antes de calcular a nova.
 *
 * O dropdown deve ter `position: absolute` no CSS.
 */

const GAP_PX = 10;
const POSITIONS = ['top', 'bottom', 'left', 'right'];

/**
 * Alterna (abre/fecha) o dropdown.
 * @param {HTMLElement} reference elemento que serve de âncora
 * @param {HTMLElement} dropdown lista a mostrar
 * @param {'top'|'bottom'|'left'|'right'} position lado em que a lista aparece
 */
export function toggleDropdown(reference, dropdown, position) {
  if (!POSITIONS.includes(position)) {
    console.warn(`toggleDropdown: posição inválida "${position}". Use top, bottom, left ou right.`);
    return;
  }
  if (!(reference instanceof HTMLElement) || !(dropdown instanceof HTMLElement)) {
    console.warn('toggleDropdown: reference e dropdown precisam ser elementos HTML.');
    return;
  }

  if (!dropdown.classList.contains('hidden')) {
    dropdown.classList.add('hidden');
    return;
  }

  const rect = reference.getBoundingClientRect();
  Object.assign(dropdown.style, { top: '', right: '', bottom: '', left: '' });

  switch (position) {
    case 'bottom':
      dropdown.style.left = `${rect.left}px`;
      dropdown.style.top = `${rect.bottom + GAP_PX}px`;
      break;
    case 'top':
      dropdown.style.left = `${rect.left}px`;
      dropdown.style.bottom = `${window.innerHeight - rect.top + GAP_PX}px`;
      break;
    case 'right':
      dropdown.style.left = `${rect.right + GAP_PX}px`;
      dropdown.style.top = `${rect.top}px`;
      break;
    case 'left':
      dropdown.style.right = `${window.innerWidth - rect.left + GAP_PX}px`;
      dropdown.style.top = `${rect.top}px`;
      break;
  }

  dropdown.classList.remove('hidden');
}
