/**
 * @file Utilitários de DOM seguros.
 *
 * Regra do projeto: dados vindos do banco ou do usuário NUNCA entram em
 * `innerHTML`. Use `h()`, que transforma textos em nós de texto — assim um
 * nome como `<img onerror=...>` aparece escrito na tela, sem ser executado.
 */

/**
 * Cria um elemento.
 *
 * @example
 *   h('button', { class: 'home-btn', type: 'button', onclick: salvar }, icon('fa-plus'), ' Novo')
 *
 * Propriedades especiais:
 * - `class`: classes CSS;
 * - `dataset`: objeto copiado para `data-*`;
 * - `onclick`, `oninput`…: viram `addEventListener`;
 * - `value`, `checked`, `disabled`, `hidden`: atribuídos como propriedade;
 * - `true` vira atributo vazio; `false`, `null` e `undefined` são ignorados.
 *
 * @param {string} tag
 * @param {Record<string, any> | null} [props]
 * @param {...(Node|string|number|null|undefined|false|Array<any>)} children textos viram nós de texto
 * @returns {HTMLElement}
 */
export function h(tag, props = null, ...children) {
  const element = document.createElement(tag);
  for (const [key, value] of Object.entries(props || {})) {
    if (value === null || value === undefined || value === false) continue;
    if (key === 'class') element.className = value;
    else if (key === 'dataset') Object.assign(element.dataset, value);
    else if (key.startsWith('on') && typeof value === 'function') element.addEventListener(key.slice(2), value);
    else if (['value', 'checked', 'disabled', 'hidden'].includes(key)) element[key] = value;
    else element.setAttribute(key, value === true ? '' : String(value));
  }
  append(element, children);
  return element;
}

/**
 * Acrescenta filhos a um elemento (textos como texto puro).
 * @param {Element} parent
 * @param {Array<any>} children
 */
export function append(parent, children) {
  for (const child of children.flat(Infinity)) {
    if (child === null || child === undefined || child === false) continue;
    parent.append(child instanceof Node ? child : String(child));
  }
}

/**
 * Ícone do Font Awesome, oculto para leitores de tela (é decorativo).
 * @param {string} name ex.: 'fa-trash'
 * @param {'solid'|'regular'|'brands'} [family]
 */
export function icon(name, family = 'solid') {
  return h('i', { class: `fa-${family} ${name}`, 'aria-hidden': 'true' });
}

/** Atalho para `document.getElementById`. */
export const byId = (id) => document.getElementById(id);

/** Troca todo o conteúdo de um elemento pelos filhos informados. */
export function replaceContent(element, ...children) {
  element.replaceChildren();
  append(element, children);
}

/**
 * Torna clicável por teclado um elemento que não é botão (cards, por exemplo):
 * recebe foco com Tab e responde a Enter e Espaço.
 * @param {HTMLElement} element
 * @param {(event: Event) => void} handler
 * @param {string} [label] nome acessível
 */
export function makeActivatable(element, handler, label) {
  element.setAttribute('role', 'button');
  element.tabIndex = 0;
  if (label) element.setAttribute('aria-label', label);
  element.addEventListener('click', handler);
  element.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handler(event);
    }
  });
  return element;
}

/**
 * Coloca um botão em estado "ocupado" e devolve uma função que restaura o rótulo original.
 * @param {HTMLButtonElement} button
 * @param {string} busyText texto exibido enquanto ocupado
 * @returns {() => void}
 */
export function setBusy(button, busyText) {
  const original = Array.from(button.childNodes, (node) => node.cloneNode(true));
  button.disabled = true;
  button.textContent = busyText;
  return () => {
    button.disabled = false;
    button.replaceChildren(...original);
  };
}
