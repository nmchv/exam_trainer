import { element } from '../components/dom.js';

export function renderTraining({ tasks, mistakeCount, onGenerate }) {
  const numbers = [...new Set(tasks.map((task) => String(task.number ?? '')))].filter(Boolean);
  const tags = [...new Set(tasks.flatMap((task) => task.tags ?? []))];
  const form = element('form', { className: 'card stack', onSubmit: (event) => {
    event.preventDefault();
    const data = new FormData(form);
    onGenerate({
      mode: data.get('mode'),
      count: Number(data.get('count')),
      taskNumbers: String(data.get('taskNumbers') ?? '').split(',').map((item) => item.trim()).filter(Boolean),
      tags: [...form.querySelectorAll('[name="tags"]:checked')].map((item) => item.value),
      difficulty: data.get('difficulty') || undefined,
      excludeUsed: data.has('excludeUsed'),
      randomize: data.has('randomize')
    });
  } }, [
    field('Формат', element('select', { className: 'text-control', name: 'mode' }, [
      option('random', 'Случайные задания'),
      option('sequential', 'Последовательно'),
      option('selected', 'Выбрать номера'),
      option('mistakes', `Мои ошибки (${mistakeCount})`)
    ])),
    field('Количество заданий', element('input', { className: 'text-control', type: 'number', name: 'count', min: '1', max: String(Math.max(tasks.length, 1)), value: String(Math.min(5, Math.max(tasks.length, 1))) })),
    field(`Номера заданий (через запятую: ${numbers.join(', ') || 'пока нет'})`, element('input', { className: 'text-control', type: 'text', name: 'taskNumbers', placeholder: 'Например: 1, 3, 5' })),
    field('Сложность', element('select', { className: 'text-control', name: 'difficulty' }, [
      option('', 'Любая сложность'), option('basic', 'Базовая'), option('medium', 'Средняя'), option('advanced', 'Повышенная')
    ])),
    tags.length ? element('fieldset', { className: 'tag-filters' }, [
      element('legend', {}, ['Темы']),
      ...tags.map((tag) => element('label', { className: 'check-label' }, [
        element('input', { type: 'checkbox', name: 'tags', value: tag }), tag
      ]))
    ]) : null,
    element('label', { className: 'check-label' }, [
      element('input', { type: 'checkbox', name: 'excludeUsed' }), 'Не повторять задания из последней попытки'
    ]),
    element('label', { className: 'check-label' }, [
      element('input', { type: 'checkbox', name: 'randomize', checked: true }), 'Перемешать задания'
    ]),
    element('p', { className: 'metric-hint' }, [`Доступно демонстрационных заданий: ${tasks.length}.`]),
    element('button', { className: 'button button-primary', type: 'submit' }, ['Собрать тренировку'])
  ]);
  return element('main', { className: 'page-shell page-enter', id: 'main' }, [
    element('div', { className: 'page-heading' }, [
      element('div', {}, [
        element('span', { className: 'eyebrow' }, ['Режим подготовки']),
        element('h1', {}, ['Настроить тренировку']),
        element('p', {}, ['Выберите количество, номера, темы и сложность. Пустые фильтры не ограничивают подбор заданий.'])
      ])
    ]),
    element('div', { className: 'two-column' }, [
      element('section', {}, [form]),
      element('aside', { className: 'card' }, [
        element('h2', {}, ['Совет']),
        element('p', {}, ['Сначала пройдите короткую случайную тренировку. После проверки ошибки можно повторить отдельно.']),
        element('a', { className: 'card-arrow', href: '#/errors' }, ['К заданиям на повторение →'])
      ])
    ])
  ]);
}

function option(value, label) {
  return element('option', { value }, [label]);
}

function field(label, control) {
  return element('label', { className: 'form-label' }, [label, control]);
}
