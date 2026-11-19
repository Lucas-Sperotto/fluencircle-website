/**
 * @file Moldura comum das páginas internas: cabeçalho e barra lateral.
 *
 * Antes, essas ~53 linhas de HTML estavam copiadas em 6 páginas (e já tinham
 * divergido). Agora são desenhadas aqui, a partir de uma única lista de itens.
 *
 * Como usar: a página declara `<body data-shell="app" data-page="...">` e carrega
 * este módulo PRIMEIRO, num `<script type="module">` próprio. Como ele não
 * depende do Firebase, a moldura aparece antes mesmo de o SDK terminar de baixar.
 *
 * O papel em cache é aplicado na hora (sem "piscar" o menu); o papel
 * confirmado no banco chega depois por `setShellUser`.
 */
import { h, icon, byId } from './dom.js';
import { sessionCache } from '../core/session-cache.js';
import { ROLES, roleLabel, normalizeRole, isStaff } from '../core/roles.js';
import { PAGES } from '../core/navigation.js';
import { mountEnvironmentBadge } from './environment-badge.js';

/**
 * Itens da barra lateral. `page` é comparado com `data-page` do `<body>`
 * para destacar o item ativo; `access` restringe o item por papel.
 */
const NAV_TOP = [
  { page: 'home', href: PAGES.home, icon: 'fa-house', label: 'Home' },
  { page: 'flash-cards', href: PAGES.flashcards, icon: 'fa-layer-group', label: 'Flash Cards' },
  { page: 'slide-show', href: PAGES.presentation, icon: 'fa-play', label: 'Iniciar sessão', access: 'mediator' },
  { page: 'set-meeting', href: PAGES.themes, icon: 'fa-comments', label: 'Temas', access: 'mediator' },
  { page: 'plans', href: PAGES.plans, icon: 'fa-calendar-week', label: 'Planos e agenda', access: 'mediator' },
];
const NAV_BOTTOM = [
  { divider: true, access: 'admin' },
  { page: 'admin', href: PAGES.admin, icon: 'fa-user-gear', label: 'Acessos', access: 'admin' },
  { page: 'manage-meetings', href: PAGES.sessions, icon: 'fa-pen-to-square', label: 'Sessões', access: 'mediator' },
];

/** Classe usada para mostrar/esconder elementos por papel (no menu e no conteúdo). */
const ACCESS_CLASS = { mediator: 'mediator-access', admin: 'admin-access' };

function navItem(item, currentPage) {
  const accessClass = item.access ? `${ACCESS_CLASS[item.access]} hidden` : '';
  if (item.divider) return h('li', { class: `sidebar-divider ${accessClass}`, 'aria-hidden': 'true' });
  const active = item.page === currentPage;
  return h('li', { class: [accessClass, active ? 'active' : ''].join(' ').trim() || null, dataset: { page: item.page } },
    h('a', { href: item.href, 'aria-current': active ? 'page' : null }, icon(item.icon), h('span', null, item.label)));
}

function renderLogo() {
  const logo = h('div', { class: 'logo', id: 'logo', role: 'link', tabindex: '0', 'aria-label': 'FluenCircle — ir para a página inicial' },
    h('div', { class: 'logo-icon' },
      h('div', { class: 'logo-circle-center' },
        h('div', { class: 'logo-circle-left' }),
        h('div', { class: 'logo-inner-circle' }))));
  const goHome = () => { window.location.href = PAGES.home; };
  logo.addEventListener('click', goHome);
  logo.addEventListener('keydown', (event) => { if (event.key === 'Enter') goHome(); });
  return logo;
}

function renderHeader() {
  return h('header', null,
    renderLogo(),
    h('div', { class: 'header-actions' },
      h('span', { class: 'user-role-badge hidden', id: 'user-role-badge' }),
      h('span', { class: 'user-email', id: 'user-email' }),
      h('button', { id: 'logout-btn', class: 'logout-btn', type: 'button', title: 'Sair' },
        icon('fa-right-from-bracket'), h('span', null, 'Sair'))));
}

function renderSidebar(currentPage) {
  // A classe "retratil" mantém a barra recolhida; o CSS a expande com :hover/:focus-within.
  return h('aside', { class: 'sidebar retratil', id: 'sidebar', 'aria-label': 'Menu principal' },
    h('nav', { class: 'sidebar-nav' },
      h('ul', { class: 'sidebar-menu-top' }, NAV_TOP.map((item) => navItem(item, currentPage))),
      h('ul', { class: 'sidebar-menu-bottom' }, NAV_BOTTOM.map((item) => navItem(item, currentPage)))));
}

/**
 * Mostra/esconde tudo que depende de papel e atualiza o badge do cabeçalho.
 * Vale para a página inteira: botões da home também usam essas classes.
 * @param {string} role
 */
export function applyRoleVisibility(role) {
  const normalized = normalizeRole(role);
  document.querySelectorAll(`.${ACCESS_CLASS.mediator}`).forEach((el) => el.classList.toggle('hidden', !isStaff(normalized)));
  document.querySelectorAll(`.${ACCESS_CLASS.admin}`).forEach((el) => el.classList.toggle('hidden', normalized !== ROLES.ADMIN));

  const badge = byId('user-role-badge');
  if (badge) {
    badge.textContent = roleLabel(normalized);
    badge.className = `user-role-badge badge-${normalized}`;
  }
}

/**
 * Exibe o e-mail e aplica o papel confirmado.
 * @param {{ email: string, role: string }} user
 */
export function setShellUser({ email, role }) {
  const emailElement = byId('user-email');
  if (emailElement) emailElement.textContent = email || '';
  applyRoleVisibility(role);
}

/** @param {() => void} handler ação do botão "Sair" */
export function onLogoutClick(handler) {
  byId('logout-btn')?.addEventListener('click', (event) => {
    event.preventDefault();
    handler();
  });
}

/**
 * Modo apresentação: esconde a barra lateral e libera a tela para os slides.
 * Ao sair, devolve o cabeçalho ao lugar (antes ficava deslocado — bug corrigido).
 * @param {boolean} active
 */
export function setPresentationMode(active) {
  document.querySelector('.sidebar')?.classList.toggle('hidden', active);
  document.querySelector('main')?.classList.toggle('no-sidebar-main', active);
  const header = document.querySelector('header');
  if (header) header.style.left = active ? '0' : '';
}

/** Desenha a moldura (uma única vez) e aplica o que estiver em cache. */
export function mountAppShell() {
  if (byId('sidebar')) return;
  const currentPage = document.body.dataset.page || '';
  document.body.prepend(renderHeader(), renderSidebar(currentPage));
  mountEnvironmentBadge();

  const cachedEmail = sessionCache.getEmail();
  if (cachedEmail) byId('user-email').textContent = cachedEmail;
  const cachedRole = sessionCache.getRole();
  if (cachedRole) applyRoleVisibility(cachedRole);
}

if (document.body?.dataset.shell === 'app') mountAppShell();
