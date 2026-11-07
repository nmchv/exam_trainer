import { createAnswerInput } from '../components/answerInput.js';
import { createTaskCard } from '../components/taskCard.js';
import { createTestNavigation } from '../components/testNavigation.js';
import { createTimer } from '../components/timer.js';
import { element } from '../components/dom.js';
import { getTaskTheory } from '../engines/taskEngine.js';

export function renderTest({ attempt, theory = [], onAnswer, onCheck, onSelect, onPrevious, onNext, onFinish, onTimeout }) {
  const task = attempt.tasks[attempt.currentIndex];
  const timer = attempt.deadline ? createTimer(attempt.deadline) : null;
  const input = createAnswerInput(task, attempt.answers[task.id]);
  input.addEventListener('input', () => onAnswer(task, input));
  input.addEventListener('change', () => onAnswer(task, input));
  const taskContent = [
    element('div', { className: 'task-meta' }, [
      element('span', { className: 'eyebrow' }, [`Задание ${task.number ?? attempt.currentIndex + 1} · ${attempt.currentIndex + 1} из ${attempt.tasks.length}`]),
      element('span', { className: 'task-type' }, [task.typeLabel ?? task.type.replaceAll('_', ' ')])
    ]),
    element('h2', { className: 'task-prompt' }, [task.prompt]),
    task.image ? element('img', { className: 'task-image', src: task.image, alt: task.imageAlt ?? 'Иллюстрация к заданию' }) : null,
    task.table ? renderTaskTable(task.table) : null,
    task.demoOnly ? element('p', { className: 'demo-note' }, ['Учебный пример. Это не задание ОГЭ и не реальный банк.']) : null,
    input,
    attempt.mode === 'practice' && attempt.checks[task.id]
      ? element('div', {
        className: attempt.checks[task.id].manualReview ? 'feedback feedback-neutral' : attempt.checks[task.id].correct ? 'feedback feedback-correct' : 'feedback feedback-wrong',
        role: 'status'
      }, [
        `${attempt.checks[task.id].feedback} ${attempt.checks[task.id].explanation ?? ''}`
      ]) : null,
    element('div', { className: 'test-controls' }, [
      element('button', { className: 'button', disabled: attempt.currentIndex === 0, onClick: onPrevious }, ['← Назад']),
      attempt.mode === 'practice' ? element('button', {
        className: 'button button-primary',
        onClick: () => onCheck(task, input)
      }, ['Проверить']) : null,
      attempt.currentIndex < attempt.tasks.length - 1
        ? element('button', { className: 'button button-primary', onClick: onNext }, ['Далее →'])
        : element('button', { className: 'button button-primary', onClick: onFinish }, ['Завершить'])
    ]),
    ...getTaskTheory(task, theory).map((item) => element('details', { className: 'card theory-inline' }, [
        element('summary', {}, ['Теория по этой теме']),
        element('h3', {}, [item.title]),
        element('p', {}, [item.summary ?? '']),
        item.algorithm?.length ? element('ol', {}, item.algorithm.map((step) => element('li', {}, [step]))) : null,
        item.commonMistakes?.length ? element('p', {}, [`Частые ошибки: ${item.commonMistakes.join('; ')}`]) : null
    ]))
  ];
  const taskCard = element('article', { className: 'card task-card' }, taskContent);
  const timerBox = element('section', { className: 'card stack' }, [
    element('div', { className: 'section-title' }, [
      element('h2', {}, ['Навигация']),
      timer ? timer.element : element('span', { className: 'status-pill' }, ['Без таймера'])
    ]),
    element('div', { className: 'test-progress' }, [
      element('span', { style: `width:${Math.round((Object.keys(attempt.answers).length / attempt.tasks.length) * 100)}%` })
    ]),
    createTestNavigation(attempt.tasks, attempt.currentIndex, attempt.answers, onSelect),
    element('p', { className: 'metric-hint' }, [`Отвечено: ${Object.keys(attempt.answers).length} из ${attempt.tasks.length}`]),
    element('button', { className: 'button button-danger', onClick: onFinish }, ['Завершить попытку'])
  ]);
  if (timer) {
    const interval = window.setInterval(() => {
      if (timer.update() <= 0) {
        window.clearInterval(interval);
        onTimeout();
      }
    }, 1000);
    timer.element.dataset.interval = String(interval);
  }
  const shell = element('main', { className: 'page-shell page-enter', id: 'main' }, [
    element('div', { className: 'page-heading' }, [
      element('div', {}, [
        element('span', { className: 'eyebrow' }, [attempt.mode === 'exam' ? 'Экзаменационный режим' : 'Тренировка']),
        element('h1', {}, [attempt.mode === 'exam' ? 'Пробный вариант' : 'Решаем задания']),
        element('p', {}, ['Ответы автоматически сохраняются в этом браузере.'])
      ])
    ]),
    task.demoOnly ? element('div', { className: 'notice-banner' }, ['Демо-банк: ответы встроены только для проверки интерфейса и не подходят для реальной подготовки.']) : null,
    element('div', { className: 'test-layout' }, [taskCard, element('aside', { className: 'test-sidebar' }, [timerBox])])
  ]);
  return shell;
}

export function taskInputForTest(task, value) {
  return createAnswerInput(task, value);
}

function renderTaskTable(rows) {
  const table = element('table', { className: 'data-table' });
  rows.forEach((row) => table.append(element('tr', {}, row.map((cell) => element('td', {}, [cell])))));
  return element('div', { className: 'table-wrap' }, [table]);
}
