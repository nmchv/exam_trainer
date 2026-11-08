import { createProgressCard } from '../components/progressCard.js';
import { element } from '../components/dom.js';
import { summarizeProgress } from '../engines/statisticsEngine.js';

export function renderHome({ registry, progress, savedAttempt, onResume, statsOverride }) {
  const enabled = registry.exams.filter((exam) => exam.enabled);
  const stats = statsOverride ?? summarizeProgress(progress);
  const progressStorage = statsOverride ? 'в аккаунте Supabase' : 'в этом браузере';
  const mistakes = statsOverride?.mistakes ?? progress.mistakes;
  return element('main', { className: 'page-shell page-enter', id: 'main' }, [
    element('section', { className: 'hero' }, [
      element('div', { className: 'hero-content' }, [
        element('span', { className: 'eyebrow' }, ['Подготовка в своём темпе']),
        element('h1', {}, ['Понятный путь к уверенному результату']),
        element('p', {}, ['Тренируйтесь на вариантах задания №1 по географии и возвращайтесь к сложным вопросам. Новые задания будут добавляться по мере подготовки банка.']),
        element('div', { className: 'hero-actions' }, [
          element('a', { className: 'button button-primary', href: '#/exams' }, ['Выбрать экзамен']),
          savedAttempt ? element('button', { className: 'button button-quiet', onClick: onResume }, ['Продолжить попытку']) : null
        ])
      ]),
      element('div', { className: 'hero-aside', 'aria-hidden': 'true' }, ['E'])
    ]),
    element('section', { className: 'section-block' }, [
      element('div', { className: 'section-title' }, [
        element('div', {}, [element('h2', {}, ['Твой прогресс']), element('p', {}, ['Небольшие регулярные шаги складываются в результат.'])]),
        element('a', { className: 'card-arrow', href: '#/progress' }, ['Подробная статистика →'])
      ]),
      element('div', { className: 'metric-grid' }, [
        createProgressCard('Завершено попыток', stats.attempts, progressStorage),
        createProgressCard('Средний результат', `${stats.average}%`, stats.attempts ? 'по завершённым тестам' : 'появится после тренировки'),
        createProgressCard('Решено заданий', stats.solved, 'за всё время'),
        createProgressCard('Задания на повторение', mistakes.length, 'из последней статистики')
      ])
    ]),
    element('section', { className: 'section-block' }, [
      element('div', { className: 'section-title' }, [
        element('div', {}, [element('h2', {}, ['Начать подготовку']), element('p', {}, ['Выбери удобный формат занятий.'])])
      ]),
      element('div', { className: 'card-grid' }, [
        ...enabled.slice(0, 1).map((exam) => actionCard('⌖', exam.title, exam.description, '#/exams', exam.demoOnly ? 'Демонстрационный режим' : 'Открыть экзамен')),
        actionCard('↗', 'Тренировка', 'Соберите короткий тест по номерам, темам и сложности.', '#/training', 'Настроить тренировку'),
        actionCard('◎', 'Теория', 'Материалы будут появляться вместе с подключением банка заданий.', '#/theory', 'Открыть раздел')
      ])
    ]),
    element('section', { className: 'section-block' }, [
      element('div', { className: 'notice-banner' }, ['Сейчас доступны 20 авторских тренировочных вариантов задания №1 по теме происхождения горных пород.'])
    ])
  ]);
}

function actionCard(icon, title, description, href, action) {
  return element('a', { className: 'card card-link', href }, [
    element('span', { className: 'card-icon', 'aria-hidden': 'true' }, [icon]),
    element('h3', {}, [title]),
    element('p', {}, [description]),
    element('span', { className: 'card-arrow' }, [`${action} →`])
  ]);
}
