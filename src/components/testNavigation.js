import { element } from './dom.js';

export function createTestNavigation(tasks, currentIndex, answers, onSelect) {
  return element('div', { className: 'question-grid', 'aria-label': 'Навигация по заданиям' },
    tasks.map((task, index) => element('button', {
      type: 'button',
      className: `question-number${index === currentIndex ? ' is-current' : ''}${answers[task.id] !== undefined ? ' is-answered' : ''}`,
      'aria-label': `Перейти к заданию ${index + 1}`,
      'aria-current': index === currentIndex ? 'step' : null,
      onClick: () => onSelect(index)
    }, [String(index + 1)])));
}
