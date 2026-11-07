import { element } from './dom.js';

export function createBreadcrumbs(items) {
  return element('nav', { className: 'breadcrumbs', 'aria-label': 'Хлебные крошки' },
    items.map((item, index) => element('span', { className: 'breadcrumb-item' }, [
      index ? element('span', { 'aria-hidden': 'true' }, [' / ']) : null,
      item.href ? element('a', { href: item.href }, [item.label]) : element('span', { 'aria-current': 'page' }, [item.label])
    ])));
}
