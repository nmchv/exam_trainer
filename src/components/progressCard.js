import { element } from './dom.js';

export function createProgressCard(label, value, hint = '') {
  return element('article', { className: 'card metric-card' }, [
    element('span', { className: 'metric-label' }, [label]),
    element('strong', { className: 'metric-value' }, [String(value)]),
    element('span', { className: 'metric-hint' }, [hint])
  ]);
}
