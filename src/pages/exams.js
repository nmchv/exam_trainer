import { element } from '../components/dom.js';

export function renderExams(exams, onStart) {
  return element('main', { className: 'page-shell page-enter', id: 'main' }, [
    element('div', { className: 'page-heading' }, [
      element('div', {}, [
        element('span', { className: 'eyebrow' }, ['Каталог']),
        element('h1', {}, ['Экзамены']),
        element('p', {}, ['Выберите экзамен, чтобы открыть режим подготовки. Новые предметы подключаются через реестр и JSON-банки.'])
      ])
    ]),
    element('div', { className: 'card-grid' }, exams.filter((exam) => exam.enabled).map((exam) =>
      element('article', { className: 'card exam-card' }, [
        element('span', { className: 'card-icon', 'aria-hidden': 'true' }, ['⌖']),
        element('span', { className: 'status-pill' }, [exam.demoOnly ? 'Демо-режим' : String(exam.year)]),
        element('h2', {}, [exam.title]),
        element('p', {}, [exam.description]),
        element('div', { className: 'hero-actions' }, [
          element('button', { className: 'button button-primary', onClick: () => onStart(exam) }, ['Начать тренировку']),
          element('button', { className: 'button', onClick: () => onStart(exam, true) }, ['Случайный вариант задания №1'])
        ])
      ])
    ))
  ]);
}
