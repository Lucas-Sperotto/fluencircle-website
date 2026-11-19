/**
 * @file Card de um encontro da agenda semanal (PR #2), usado pela equipe em
 * plans.html (clicável, abre o editor) e pelo participante na home (com as
 * perguntas de preparação e o link para entrar).
 *
 * Recebe um item de `buildWeekAgenda` (domain/plans.js); o link já chega
 * filtrado (só https), e tudo é montado com h(), sem HTML cru.
 */
import { h, icon, makeActivatable } from './dom.js';

/**
 * @param {ReturnType<typeof import('../domain/plans.js').buildWeekAgenda>[number]} item
 * @param {Object} [options]
 * @param {(item: object) => void} [options.onActivate] torna o card clicável (equipe)
 * @param {boolean} [options.forStudent] mostra perguntas e o botão "Entrar"
 * @returns {HTMLElement}
 */
export function renderWeekSlotCard(item, { onActivate = null, forStudent = false } = {}) {
  const joinLink = forStudent && item.meetLink
    ? h('a', { class: 'week-slot__join', href: item.meetLink, target: '_blank', rel: 'noopener noreferrer' }, icon('fa-video'), ' Entrar')
    : null;
  const linkHint = !forStudent && item.meetLink ? h('span', { class: 'week-slot__link' }, icon('fa-video'), ' link') : null;
  const questions = forStudent && item.questions.length
    ? h('details', { class: 'week-slot__questions' },
      h('summary', null, icon('fa-book-open'), ' Perguntas de preparação'),
      h('ol', null, item.questions.map((q) => h('li', null, q))))
    : null;

  const card = h('div', { class: `week-slot${item.topic ? '' : ' week-slot--empty'}`, 'data-slot': item.slotKey },
    h('div', { class: 'week-slot__day', 'aria-hidden': 'true' },
      h('span', { class: 'week-slot__weekday' }, item.weekdayShort),
      h('span', { class: 'week-slot__monthday' }, String(item.monthDay))),
    h('div', { class: 'week-slot__body' },
      h('p', { class: 'week-slot__topic' }, item.topic || (forStudent ? 'Tema a definir' : 'Tema não definido')),
      h('p', { class: 'week-slot__meta' },
        h('span', { class: 'week-slot__when' }, icon('fa-clock', 'regular'),
          h('span', { class: 'week-slot__sr' }, ` ${item.weekdayShort} ${item.monthDay} ·`), ` ${item.startTime} – ${item.endTime}`),
        h('span', { class: 'badge-plan' }, item.planName),
        linkHint, joinLink),
      questions));

  if (onActivate) {
    makeActivatable(card, () => onActivate(item), `Definir tema de ${item.weekdayShort} ${item.monthDay}, ${item.startTime}, plano ${item.planName}`);
  }
  return card;
}
