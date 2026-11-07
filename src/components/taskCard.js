import { createAnswerInput } from './answerInput.js';
import { element } from './dom.js';

export function createTaskCard(task, { answer, check, onCheck, onAnswer, readOnly = false } = {}) {
  const answerInput = createAnswerInput(task, answer, readOnly);
  answerInput.addEventListener('input', onAnswer);
  answerInput.addEventListener('change', onAnswer);
  const content = [
    element('div', { className: 'task-meta' }, [
      element('span', { className: 'eyebrow' }, [`Задание ${task.number ?? '—'}`]),
      element('span', { className: 'task-type' }, [task.typeLabel ?? task.type.replaceAll('_', ' ')])
    ]),
    element('h2', { className: 'task-prompt' }, [task.prompt]),
    task.image ? element('img', { className: 'task-image', src: task.image, alt: task.imageAlt ?? 'Иллюстрация к заданию' }) : null,
    task.table ? renderTable(task.table) : null,
    task.demoOnly ? element('p', { className: 'demo-note' }, ['Учебный пример. Это не задание ОГЭ и не реальный банк.']) : null,
    answerInput
  ];
  if (check) {
    content.push(element('div', {
      className: check.manualReview ? 'feedback feedback-neutral' : check.correct ? 'feedback feedback-correct' : 'feedback feedback-wrong',
      role: 'status'
    }, [check.manualReview ? check.feedback : `${check.feedback} ${check.explanation ?? ''}`]));
  }
  if (!readOnly && !check?.correct) {
    content.push(element('button', { type: 'button', className: 'button button-primary', onClick: onCheck }, ['Проверить ответ']));
  }
  return element('article', { className: 'card task-card' }, content);
}

function renderTable(rows) {
  const table = element('table', { className: 'data-table' });
  for (const row of rows) table.append(element('tr', {}, row.map((cell) => element('td', {}, [cell]))));
  return element('div', { className: 'table-wrap' }, [table]);
}
