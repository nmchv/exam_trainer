import { element } from './dom.js';

export function createResultCard(result, title = 'Результат попытки') {
  return element('article', { className: 'card result-card' }, [
    element('span', { className: 'eyebrow' }, [title]),
    element('strong', { className: 'result-score' }, [`${result.score} / ${result.maxScore}`]),
    element('span', { className: 'result-percent' }, [`${result.percentage}% выполнено`]),
    result.grade ? element('span', { className: 'status-pill' }, [`Оценка: ${result.grade}`]) : null
  ]);
}
