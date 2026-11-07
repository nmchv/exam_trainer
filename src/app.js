import { initializeApp } from './core/appInitializer.js';
import { parseRoute, subscribeToRoute, navigate } from './core/router.js';
import { element } from './components/dom.js';
import { createHeader } from './components/header.js';
import { getEnabledExams } from './database/registryLoader.js';
import { loadExamData } from './database/taskLoader.js';
import { generateExam } from './engines/examGenerator.js';
import { generateTest } from './engines/testGenerator.js';
import { evaluateTask } from './engines/taskEngine.js';
import { scoreAttempt } from './engines/scoringEngine.js';
import { getProgress, getMistakeIds, recordAttempt } from './engines/progressTracker.js';
import { summarizeProgress } from './engines/statisticsEngine.js';
import { createAttempt, restoreAttempt, saveAttempt, clearActiveAttempt, saveAttemptRemotely, getRemoteUnfinishedAttempt } from './services/attemptService.js';
import { isSupabaseConfigured } from './services/supabaseClient.js';
import { getCurrentUser, signIn, signOut, signUp } from './services/authService.js';
import { renderHome } from './pages/home.js';
import { renderExams } from './pages/exams.js';
import { renderTraining } from './pages/training.js';
import { renderTheory } from './pages/theory.js';
import { renderTest } from './pages/test.js';
import { renderResults } from './pages/results.js';
import { renderProfile } from './pages/profile.js';
import { createProgressCard } from './components/progressCard.js';
import { readAnswer } from './components/answerInput.js';
import { getRemoteStatistics } from './services/statisticsService.js';

const root = document.querySelector('#app');
window.addEventListener('scroll', () => {
  document.querySelector('#site-header')?.classList.toggle('is-scrolled', window.scrollY > 8);
}, { passive: true });
let appState;
let activeAttempt = null;
let lastResult = null;
let lastAttempt = null;
let currentUser = null;
let remoteStats = null;
let loadError = '';
let routeError = '';
let activeTimerInterval = null;
let remoteSaveTimer = null;
const examData = new Map();

function getExam(id = 'oge-geography') {
  const exam = appState.get().registry.exams.find((item) => item.id === id && item.enabled);
  if (!exam) throw new Error(`Экзамен «${id}» не найден или отключён в реестре.`);
  return exam;
}

async function loadData(exam) {
  if (!examData.has(exam.id)) examData.set(exam.id, await loadExamData(exam));
  return examData.get(exam.id);
}

function mountPage(content, route = 'home') {
  if (routeError) {
    const main = content.matches?.('main') ? content : content.querySelector('main');
    main?.prepend(element('div', { className: 'error-banner', role: 'alert' }, [routeError]));
    routeError = '';
  }
  root.replaceChildren(
    createHeader(route),
    content,
    element('footer', { className: 'footer' }, ['Exam Trainer · учебный программный каркас'])
  );
  const header = root.querySelector('#site-header');
  header?.classList.toggle('is-scrolled', window.scrollY > 8);
}

function navigateToHome() {
  navigate('home');
}

function replayComposition(source) {
  if (!source?.tasks?.length) {
    loadError = 'Состав предыдущего теста не сохранён.';
    renderRoute();
    return;
  }
  activeAttempt = createAttempt({
    examId: source.examId,
    mode: source.mode,
    tasks: source.tasks,
    durationMinutes: source.durationMinutes
  });
  lastAttempt = activeAttempt;
  saveAttempt(activeAttempt);
  const start = () => navigate('test');
  if (currentUser && !activeAttempt.tasks.every((task) => task.demoOnly)) {
    saveAttemptRemotely(activeAttempt).then(start).catch((error) => {
      loadError = `Попытка сохранена локально, но не синхронизирована с Supabase: ${error.message}`;
      start();
    });
  } else {
    start();
  }
}

function startMistakes(tasks, ids = getMistakeIds()) {
  try {
    const mistakeTasks = generateTest(tasks, {
      count: ids.length,
      mode: 'mistakes',
      mistakeIds: ids,
      randomize: true
    });
    activeAttempt = createAttempt({ examId: 'oge-geography', mode: 'practice', tasks: mistakeTasks });
    lastAttempt = activeAttempt;
    saveAttempt(activeAttempt);
    navigate('test');
  } catch (error) {
    loadError = error.message;
    renderRoute();
  }
}

async function restoreCloudAttempt(remoteAttempt) {
  const exam = getExam(remoteAttempt.exam_id);
  const data = await loadData(exam);
  const rows = [...(remoteAttempt.task_rows ?? [])].sort((a, b) => a.position - b.position);
  const taskById = new Map(data.tasks.map((task) => [task.id, task]));
  const tasks = rows.map((row) => {
    const task = taskById.get(row.task_id);
    if (!task) throw new Error(`В банке больше нет задания ${row.task_id}, сохранённого в попытке.`);
    return { ...task, maxScore: Number(row.max_score) };
  });
  activeAttempt = {
    id: remoteAttempt.id,
    examId: remoteAttempt.exam_id,
    mode: remoteAttempt.mode,
    tasks,
    taskIds: rows.map((row) => row.task_id),
    attemptTaskIds: Object.fromEntries(rows.map((row) => [row.task_id, row.id])),
    answers: Object.fromEntries(rows.flatMap((row) => row.answers?.length
      ? [[row.task_id, row.answers[0].user_answer]] : [])),
    checks: {},
    currentIndex: Number(remoteAttempt.state?.current_index ?? 0),
    status: 'in_progress',
    startedAt: remoteAttempt.started_at,
    durationMinutes: data.config.durationMinutes,
    deadline: remoteAttempt.state?.deadline ?? null
  };
  saveAttempt(activeAttempt);
  return activeAttempt;
}

async function startPractice(exam, mode = 'practice') {
  try {
    loadError = '';
    const data = await loadData(exam);
    if (mode === 'exam') {
      const generated = generateExam(data.tasks, {
        ...data.config.taskSelection,
        examId: exam.id,
        durationMinutes: data.config.durationMinutes,
        scoring: data.config.scoring
      });
      activeAttempt = createAttempt({
        examId: exam.id, mode: 'exam', tasks: generated.tasks,
        durationMinutes: generated.durationMinutes, id: generated.id
      });
    } else {
      const chosen = generateTest(data.tasks, {
        count: Math.min(5, data.tasks.length),
        mode: 'random',
        randomize: true
      });
      activeAttempt = createAttempt({ examId: exam.id, mode: 'practice', tasks: chosen });
    }
    lastAttempt = activeAttempt;
    saveAttempt(activeAttempt);
    if (currentUser && !activeAttempt.tasks.every((task) => task.demoOnly)) {
      try {
        await saveAttemptRemotely(activeAttempt);
      } catch (error) {
        loadError = `Попытка сохранена локально, но не синхронизирована с Supabase: ${error.message}`;
      }
    }
    navigate('test');
  } catch (error) {
    loadError = error.message;
    renderRoute();
  }
}

function updateAttempt(patch) {
  activeAttempt = { ...activeAttempt, ...patch };
  lastAttempt = activeAttempt;
  try {
    saveAttempt(activeAttempt);
  } catch (error) {
    loadError = error.message;
    renderRoute();
    return;
  }
  if (currentUser && !activeAttempt.tasks.every((task) => task.demoOnly)) {
    window.clearTimeout(remoteSaveTimer);
    remoteSaveTimer = window.setTimeout(() => {
      saveAttemptRemotely(activeAttempt).catch((error) => {
        loadError = `Попытка сохранена локально, но не синхронизирована с Supabase: ${error.message}`;
        renderRoute();
      });
    }, 350);
  }
}

async function completeAttempt(timedOut = false) {
  if (!activeAttempt) return;
  window.clearTimeout(remoteSaveTimer);
  const unanswered = activeAttempt.tasks.filter((task) => activeAttempt.answers[task.id] === undefined || activeAttempt.answers[task.id] === '');
  if (!timedOut && unanswered.length && !window.confirm(`Осталось без ответа заданий: ${unanswered.length}. Завершить попытку?`)) return;
  try {
    const data = await loadData(getExam(activeAttempt.examId));
    const secureAttempt = !activeAttempt.tasks.every((task) => task.demoOnly);
    if (secureAttempt && !currentUser) {
      throw new Error('Войдите в Supabase-аккаунт, чтобы завершить попытку с реальными заданиями.');
    }
    let result;
    let checks;
    if (secureAttempt) {
      const { finishAttemptRemotely } = await import('./services/attemptService.js');
      const response = await finishAttemptRemotely(activeAttempt);
      result = response.result;
      checks = Object.fromEntries(result.results.map((item) => [item.taskId, {
        correct: item.correct,
        manualReview: item.manualReview,
        feedback: item.manualReview ? 'Ответ требует ручной проверки.' : item.correct ? 'Верно.' : 'Пока неверно.',
        explanation: item.explanation
      }]));
    } else {
      const checked = await Promise.all(activeAttempt.tasks.map(async (task) => ({
        task,
        result: await evaluateTask(task, activeAttempt.answers[task.id], activeAttempt.id)
      })));
      result = scoreAttempt(checked, activeAttempt.mode === 'exam' ? data.config.scoring : {});
      checks = Object.fromEntries(checked.map(({ task, result: check }) => [task.id, check]));
    }
    const completed = {
      ...activeAttempt,
      checks,
      status: 'completed',
      finishedAt: new Date().toISOString()
    };
    lastResult = result;
    lastAttempt = completed;
    try {
      recordAttempt(completed, result);
    } catch (error) {
      loadError = `Результат рассчитан, но статистику не удалось сохранить в браузере: ${error.message}`;
    }
    if (secureAttempt) {
      try {
        remoteStats = await getRemoteStatistics();
      } catch (error) {
        loadError = `Результат сохранён, но обновить облачную статистику не удалось: ${error.message}`;
      }
    }
    try {
      clearActiveAttempt();
    } catch (error) {
      loadError = `Не удалось очистить сохранённое состояние попытки: ${error.message}`;
    }
    activeAttempt = null;
    navigate('results');
  } catch (error) {
    loadError = `Не удалось завершить попытку: ${error.message}`;
    renderRoute();
  }
}

function handleAnswer(task, control) {
  const value = readAnswer(task, control);
  const answers = { ...activeAttempt.answers, [task.id]: value };
  const checks = { ...activeAttempt.checks };
  delete checks[task.id];
  updateAttempt({ answers, checks });
  const button = root.querySelectorAll('.question-number')[activeAttempt.currentIndex];
  button?.classList.add('is-answered');
}

async function renderRoute() {
  if (!appState) return;
  if (activeTimerInterval !== null) {
    window.clearInterval(activeTimerInterval);
    activeTimerInterval = null;
  }
  routeError = loadError;
  loadError = '';
  const { name, params } = parseRoute();
  try {
    if (name === 'home' || name === 'dashboard') {
      mountPage(renderHome({
        registry: appState.get().registry,
        progress: getProgress(),
        statsOverride: remoteStats?.attempts ? remoteStats : undefined,
        savedAttempt: activeAttempt ?? restoreAttempt(),
        onResume: () => {
          activeAttempt = activeAttempt ?? restoreAttempt();
          navigate('test');
        }
      }), 'home');
      return;
    }
    if (name === 'exams') {
      mountPage(renderExams(getEnabledExams(appState.get().registry), (exam, isFullExam) => {
        startPractice(exam, isFullExam ? 'exam' : 'practice');
      }), 'exams');
      return;
    }
    if (name === 'errors') {
      const exam = getExam(params[0] || 'oge-geography');
      const data = await loadData(exam);
      mountPage(renderProgressPage(name, data.tasks), 'progress');
      return;
    }
    if (name === 'training') {
      const exam = getExam(params[0] || 'oge-geography');
      const data = await loadData(exam);
      const mistakes = remoteStats?.mistakes ?? getMistakeIds();
      const content = renderTraining({
        tasks: data.tasks,
        mistakeCount: mistakes.length,
        onGenerate: async (options) => {
          try {
            const previous = getProgress().attempts[0];
            const tasks = generateTest(data.tasks, {
              ...options,
              count: options.mode === 'mistakes' ? Math.min(options.count, mistakes.length) : options.count,
              mistakeIds: mistakes,
              excludeIds: options.excludeUsed ? (previous?.taskIds ?? []) : [],
              randomize: options.mode === 'sequential' ? false : options.randomize
            });
            activeAttempt = createAttempt({ examId: exam.id, mode: 'practice', tasks });
            lastAttempt = activeAttempt;
            saveAttempt(activeAttempt);
            if (currentUser && !activeAttempt.tasks.every((task) => task.demoOnly)) {
              try {
                await saveAttemptRemotely(activeAttempt);
              } catch (error) {
                loadError = `Попытка сохранена локально, но не синхронизирована с Supabase: ${error.message}`;
              }
            }
            navigate('test');
          } catch (error) {
            loadError = error.message;
            renderRoute();
          }
        }
      });
      mountPage(content, 'training');
      return;
    }
    if (name === 'theory') {
      const exam = getExam(params[0] || 'oge-geography');
      const data = await loadData(exam);
      mountPage(renderTheory(data.theory), 'theory');
      return;
    }
    if (name === 'test') {
      activeAttempt = activeAttempt ?? restoreAttempt();
      if (!activeAttempt) {
        navigateToHome();
        return;
      }
      const callbacks = {
        attempt: activeAttempt,
        theory: (await loadData(getExam(activeAttempt.examId))).theory,
        onAnswer: handleAnswer,
        onCheck: async (task, control) => {
          try {
            const answer = readAnswer(task, control);
            const check = await evaluateTask(task, answer, activeAttempt.id);
            const checks = { ...activeAttempt.checks, [task.id]: check };
            updateAttempt({ checks });
            renderRoute();
          } catch (error) {
            loadError = error.message;
            renderRoute();
          }
        },
        onSelect: (index) => {
          updateAttempt({ currentIndex: index });
          renderRoute();
        },
        onPrevious: () => {
          updateAttempt({ currentIndex: Math.max(0, activeAttempt.currentIndex - 1) });
          renderRoute();
        },
        onNext: () => {
          updateAttempt({ currentIndex: Math.min(activeAttempt.tasks.length - 1, activeAttempt.currentIndex + 1) });
          renderRoute();
        },
        onFinish: completeAttempt,
        onTimeout: () => completeAttempt(true)
      };
      const content = renderTest(callbacks);
      activeTimerInterval = Number(content.querySelector('.timer')?.dataset.interval) || null;
      mountPage(content, 'test');
      return;
    }
    if (name === 'results') {
      const saved = getProgress().attempts[0];
      const result = lastResult ?? saved?.details?.result;
      const completed = lastAttempt ?? saved?.details?.attempt;
      if (!result || !completed) {
        mountPage(element('main', { className: 'page-shell page-enter', id: 'main' }, [
          element('div', { className: 'empty-state' }, ['Завершённых попыток пока нет.']),
          element('a', { className: 'button button-primary', href: '#/training' }, ['Начать тренировку'])
        ]), 'home');
        return;
      }
      const content = renderResults({
        result,
        tasks: completed.tasks,
        answers: completed.answers,
        onRetry: () => startPractice(getExam(completed.examId)),
        onReplay: () => replayComposition(completed)
      });
      mountPage(content, 'home');
      return;
    }
    if (name === 'profile') {
      mountPage(renderProfile({
        user: currentUser,
        configured: isSupabaseConfigured(),
        onSignIn: (details) => authenticate('signin', details),
        onSignUp: (details) => authenticate('signup', details),
        onSignOut: async () => {
          try {
            await signOut();
            currentUser = null;
            renderRoute();
          } catch (error) {
            loadError = error.message;
            renderRoute();
          }
        }
      }), 'profile');
      return;
    }
    if (name === 'progress' || name === 'history') {
      mountPage(renderProgressPage(name), 'progress');
      return;
    }
  } catch (error) {
    loadError = error.message;
    routeError = error.message;
    mountPage(element('main', { className: 'page-shell page-enter', id: 'main' }, [
      element('div', { className: 'page-heading' }, [
        element('div', {}, [element('span', { className: 'eyebrow' }, ['Не удалось открыть раздел']), element('h1', {}, ['Что-то пошло не так'])])
      ])
    ]), name);
  }
}

async function authenticate(action, details) {
  try {
    const response = action === 'signup'
      ? await signUp(details.email, details.password, details.displayName)
      : await signIn(details.email, details.password);
    currentUser = response.session?.user ?? null;
    if (action === 'signup' && !currentUser) {
      loadError = 'Аккаунт создан. Проверьте почту и подтвердите адрес, затем войдите.';
    } else if (currentUser) {
      loadError = '';
      try {
        remoteStats = await getRemoteStatistics();
      } catch (error) {
        loadError = `Вход выполнен, но облачную статистику загрузить не удалось: ${error.message}`;
      }
      try {
        const remoteAttempt = await getRemoteUnfinishedAttempt();
        if (remoteAttempt) await restoreCloudAttempt(remoteAttempt);
      } catch (error) {
        loadError = `Вход выполнен, но попытку из Supabase восстановить не удалось: ${error.message}`;
      }
    }
    renderRoute();
  } catch (error) {
    loadError = `Не удалось выполнить вход: ${error.message}`;
    renderRoute();
  }
}

function renderProgressPage(route, tasks = []) {
  const progress = getProgress();
  const stats = remoteStats?.attempts ? remoteStats : summarizeProgress(progress);
  const mistakeIds = remoteStats?.mistakes ?? progress.mistakes;
  const list = route === 'errors'
    ? mistakeIds.map((id) => {
      const task = tasks.find((item) => item.id === id);
      return element('article', { className: 'card result-row' }, [
        element('span', {}, [task?.prompt ?? `Задание ${id}`]),
        element('button', { className: 'button', onClick: () => startMistakes(tasks, [id]) }, ['Повторить'])
      ]);
    })
    : stats.latest.map((attempt) => element('article', { className: 'card result-row' }, [
      element('span', {}, [new Date(attempt.finishedAt).toLocaleString('ru-RU')]),
      element('span', {}, [`${attempt.score} / ${attempt.maxScore} · ${attempt.percentage}%`]),
      attempt.details?.attempt ? element('button', {
        className: 'button',
        onClick: () => replayComposition(attempt.details.attempt)
      }, ['Повторить этот набор']) : null
    ]));
  return element('main', { className: 'page-shell page-enter', id: 'main' }, [
    element('div', { className: 'page-heading' }, [
      element('div', {}, [
        element('span', { className: 'eyebrow' }, ['Аналитика']),
        element('h1', {}, [route === 'errors' ? 'Мои ошибки' : route === 'history' ? 'История попыток' : 'Прогресс']),
        element('p', {}, [remoteStats?.attempts
          ? 'Облачная статистика аккаунта Supabase.'
          : 'Локальная статистика текущего браузера. Настройте Supabase для синхронизации аккаунта.'])
      ])
    ]),
    route !== 'errors' ? element('div', { className: 'hero-actions' }, [
      element('a', { className: 'button', href: '#/errors' }, ['Мои ошибки']),
      element('a', { className: 'button', href: '#/history' }, ['История попыток'])
    ]) : mistakeIds.length ? element('div', { className: 'hero-actions' }, [
      element('button', { className: 'button button-primary', onClick: () => startMistakes(tasks, mistakeIds) }, ['Повторить все ошибки'])
    ]) : null,
    route === 'errors' ? null : element('div', { className: 'metric-grid' }, [
      createProgressCard('Завершено попыток', stats.attempts),
      createProgressCard('Средний результат', `${stats.average}%`),
      createProgressCard('Решено заданий', stats.solved),
      createProgressCard('На повторение', mistakeIds.length)
    ]),
    element('section', { className: 'section-block' }, [
      element('div', { className: 'section-title' }, [element('h2', {}, [route === 'errors' ? 'Задания для повторения' : 'Последние попытки'])]),
      list.length ? element('div', { className: 'result-list' }, list) : element('div', { className: 'empty-state' }, ['Здесь пока пусто. Начните первую тренировку.'])
    ]),
    route !== 'errors' && stats.topics?.length ? element('section', { className: 'section-block' }, [
      element('div', { className: 'section-title' }, [element('h2', {}, ['Задания и темы'])]),
      element('div', { className: 'card-grid' }, stats.topics.map((topic) =>
        element('article', { className: 'card metric-card' }, [
          element('span', { className: 'metric-label' }, [topic.label]),
          element('strong', { className: 'metric-value' }, [`${topic.accuracy}%`]),
          element('span', { className: 'metric-hint' }, [`Попыток: ${topic.attempts}`])
        ])
      ))
    ]) : null
  ]);
}

async function main() {
  try {
    appState = await initializeApp();
    activeAttempt = appState.get().savedAttempt;
    if (isSupabaseConfigured()) {
      try {
        currentUser = await getCurrentUser();
      } catch (error) {
        loadError = `Supabase настроен, но сессию загрузить не удалось: ${error.message}`;
      }
      if (currentUser) {
        try {
          remoteStats = await getRemoteStatistics();
        } catch (error) {
          loadError = `Облачную статистику загрузить не удалось: ${error.message}`;
        }
        try {
          const remoteAttempt = await getRemoteUnfinishedAttempt();
          if (remoteAttempt) await restoreCloudAttempt(remoteAttempt);
        } catch (error) {
          loadError = `Сохранённую попытку Supabase восстановить не удалось: ${error.message}`;
        }
      }
    }
    subscribeToRoute(renderRoute);
  } catch (error) {
    root.replaceChildren(element('main', { className: 'page-shell' }, [
      element('div', { className: 'error-banner', role: 'alert' }, [`Не удалось запустить приложение: ${error.message}`])
    ]));
  }
}

main();
