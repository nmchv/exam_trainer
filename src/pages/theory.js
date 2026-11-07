import { element } from '../components/dom.js';

export function renderTheory(theory) {
  const cards = theory.map((item) => element('article', { className: 'card theory-card' }, [
    element('span', { className: 'eyebrow' }, ['Материал']),
    element('h2', {}, [item.title]),
    element('p', {}, [item.summary ?? '']),
    item.algorithm?.length ? element('div', {}, [
      element('h3', {}, ['Алгоритм']),
      element('ol', {}, item.algorithm.map((step) => element('li', {}, [step])))
    ]) : null,
    item.commonMistakes?.length ? element('div', {}, [
      element('h3', {}, ['Частые ошибки']),
      element('ul', {}, item.commonMistakes.map((mistake) => element('li', {}, [mistake])))
    ]) : null,
    item.examples?.length ? element('div', {}, [
      element('h3', {}, ['Примеры']),
      ...item.examples.map((example) => element('p', {}, [example]))
    ]) : null
  ]));
  return element('main', { className: 'page-shell page-enter', id: 'main' }, [
    element('div', { className: 'page-heading' }, [
      element('div', {}, [
        element('span', { className: 'eyebrow' }, ['База знаний']),
        element('h1', {}, ['Теория']),
        element('p', {}, ['Материалы связаны с типами заданий и загружаются вместе с банком экзамена.'])
      ])
    ]),
    cards.length ? element('div', { className: 'theory-list' }, cards)
      : element('div', { className: 'empty-state' }, ['Теоретические материалы появятся, когда будет добавлен учебный банк.'])
  ]);
}
