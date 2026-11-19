/**
 * @file Slides da sessão ao vivo: título do tema, uma pergunta por slide e o slide final.
 */
import { h, replaceContent } from '../../ui/dom.js';

/** Índice do slide de título (as perguntas começam em 0). */
const TITLE_SLIDE = -1;

/**
 * @param {HTMLElement} slideElement área onde o slide é desenhado (.slide)
 */
export function createSlideDeck(slideElement) {
  let topic = '';
  let questions = [];
  let index = TITLE_SLIDE;

  function render() {
    if (index === TITLE_SLIDE) {
      replaceContent(slideElement, h('span', { class: 'title' }, topic));
    } else if (index < questions.length) {
      replaceContent(slideElement, h('div', { class: 'questionItem' },
        h('span', { class: 'number' }, String(index + 1)),
        h('span', { class: 'question' }, questions[index])));
    } else {
      replaceContent(slideElement, h('div', { class: 'questionItem' }, h('span', { class: 'question' }, 'Fim da sessão')));
    }
  }

  return {
    /**
     * Começa do slide de título.
     * @param {string} newTopic
     * @param {string[]} newQuestions
     */
    start(newTopic, newQuestions) {
      topic = newTopic;
      questions = newQuestions;
      index = TITLE_SLIDE;
      render();
    },
    next() {
      if (index < questions.length) {
        index += 1;
        render();
      }
    },
    previous() {
      if (index > TITLE_SLIDE) {
        index -= 1;
        render();
      }
    },
  };
}
