import { createResultCard } from '../components/resultCard.js';
import { element } from '../components/dom.js';

export function renderResults({ result, tasks, answers, onRetry, onReplay }) {
  const rows = result.results.map((item, index) => {
    const task = tasks.find((candidate) => candidate.id === item.taskId);
    return element('article', { className: 'card result-row' }, [
      element('span', {}, [`Задание ${task?.number ?? index + 1}: ${task?.prompt ?? ''}`]),
      element('span', {}, [
        item.correct === null ? 'Нужна ручная проверка' : `${item.awardedScore} / ${item.maxScore} балл.`
      ]),
      element('div', { className: 'result-explanation' }, [
        element('p', {}, [`Ваш ответ: ${formatAnswer(answers[item.taskId])}`]),
        item.explanation || task?.explanation ? element('p', {}, [item.explanation || task.explanation]) : null
      ])
    ]);
  });
  return element('main', { className: 'page-shell page-enter', id: 'main' }, [
    element('div', { className: 'page-heading' }, [
      element('div', {}, [
        element('span', { className: 'eyebrow' }, ['Попытка завершена']),
        element('h1', {}, ['Результат']),
        element('p', {}, ['Посмотрите, что получилось, и решите, что стоит повторить.'])
      ])
    ]),
    element('div', { className: 'two-column' }, [
      element('section', {}, [
        createResultCard(result),
        element('div', { className: 'hero-actions' }, [
          element('a', { className: 'button', href: '#/progress' }, ['К прогрессу']),
          element('button', { className: 'button', onClick: onReplay }, ['Повторить этот набор']),
          element('button', { className: 'button button-primary', onClick: onRetry }, ['Новая тренировка'])
        ])
      ]),
      element('aside', { className: 'card' }, [
        element('h2', {}, ['Что дальше?']),
        element('p', {}, ['Перейдите к разделу «Мои ошибки», чтобы повторить задания с неверными ответами.']),
        element('a', { className: 'card-arrow', href: '#/errors' }, ['Повторить ошибки →'])
      ])
    ]),
    element('section', { className: 'section-block' }, [
      element('div', { className: 'section-title' }, [element('h2', {}, ['Ответы и объяснения'])]),
      element('div', { className: 'result-list' }, rows)
    ])
  ]);
}

function formatAnswer(answer) {
  if (answer === undefined || answer === '') return 'Нет ответа';
  return typeof answer === 'object' ? JSON.stringify(answer) : String(answer);
}
