import { element } from './dom.js';

export function createHeader(active = 'home') {
  const navItems = [
    ['home', 'Обзор', '#/home'],
    ['exams', 'Экзамены', '#/exams'],
    ['training', 'Тренировки', '#/training'],
    ['theory', 'Теория', '#/theory'],
    ['progress', 'Прогресс', '#/progress']
  ];
  const nav = element('nav', { className: 'main-nav', 'aria-label': 'Основная навигация' },
    navItems.map(([id, label, href]) => element('a', {
      href, className: id === active ? 'nav-link is-active' : 'nav-link',
      'aria-current': id === active ? 'page' : null
    }, [label])));
  const currentTheme = document.documentElement.dataset.theme;
  const themeButton = element('button', {
    className: 'icon-button', type: 'button', 'data-theme-toggle': '',
    'aria-label': currentTheme === 'light' ? 'Включить тёмную тему' : 'Включить светлую тему',
    title: currentTheme === 'light' ? 'Включить тёмную тему' : 'Включить светлую тему'
  }, ['◐']);
  themeButton.addEventListener('click', toggleTheme);
  return element('header', { className: 'site-header', id: 'site-header' }, [
    element('a', { className: 'brand', href: '#/home', 'aria-label': 'Exam Trainer — на главную' }, [
      element('span', { className: 'brand-mark', 'aria-hidden': 'true' }, ['E']),
      element('span', {}, [
        element('strong', {}, ['Exam Trainer']),
        element('small', {}, ['Подготовка без суеты'])
      ])
    ]),
    nav,
    element('div', { className: 'header-actions' }, [
      themeButton,
      element('a', { className: 'avatar-button', href: '#/profile', title: 'Профиль' }, ['Я'])
    ])
  ]);
}

function toggleTheme() {
  const root = document.documentElement;
  const next = root.dataset.theme === 'light' ? 'dark' : 'light';
  root.classList.add('theme-anim');
  root.dataset.theme = next;
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', next === 'dark' ? '#08090b' : '#f5f7fa');
  try {
    localStorage.setItem('nmchv-theme', next);
  } catch (error) {
    console.error('Не удалось сохранить тему оформления.', error);
  }
  const button = document.querySelector('[data-theme-toggle]');
  button?.setAttribute('aria-label', next === 'dark' ? 'Включить светлую тему' : 'Включить тёмную тему');
  window.setTimeout(() => root.classList.remove('theme-anim'), 420);
}
