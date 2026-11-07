const cache = new Map();

export async function loadExamConfig(exam) {
  if (!exam?.id || !exam?.path) throw new TypeError('Для загрузки конфигурации требуется экзамен из реестра.');
  const path = `${exam.path.replace(/\/+$/, '')}/exam.json`;
  const response = await fetch(new URL(path, document.baseURI));
  if (!response.ok) throw new Error(`Не удалось загрузить конфигурацию ${exam.id} (${response.status}).`);
  const config = await response.json();
  if (config.schemaVersion !== '1.0.0' || config.examId !== exam.id || !Array.isArray(config.taskFiles)) {
    throw new TypeError(`Конфигурация экзамена ${exam.id} имеет неподдерживаемый формат.`);
  }
  return config;
}

function assertTask(task, examId) {
  if (!task || typeof task !== 'object') throw new TypeError('Задание должно быть объектом.');
  for (const field of ['id', 'type', 'prompt']) {
    if (typeof task[field] !== 'string' || !task[field].trim()) {
      throw new TypeError(`У задания должен быть заполнен ${field}.`);
    }
  }
  if (task.examId !== undefined && task.examId !== examId) {
    throw new TypeError(`Задание ${task.id} относится к другому экзамену.`);
  }
}

export function validateTaskBank(data, examId) {
  if (!data || data.schemaVersion !== '1.0.0' || data.examId !== examId || !Array.isArray(data.tasks)) {
    throw new TypeError('Банк должен соответствовать схеме 1.0.0 и содержать tasks.');
  }
  const ids = new Set();
  for (const task of data.tasks) {
    assertTask(task, examId);
    if (!data.demoOnly && Object.hasOwn(task, 'answer')) {
      throw new TypeError(`Публичное задание ${task.id} содержит ответ. Ключи ответов должны храниться только в Supabase.`);
    }
    if (ids.has(task.id)) throw new TypeError(`Повторяющийся id задания: ${task.id}`);
    ids.add(task.id);
  }
  return data.tasks;
}

export async function loadExamData(exam, { force = false } = {}) {
  if (!exam?.id || !exam?.path) throw new TypeError('Для загрузки банка требуется экзамен из реестра.');
  if (!force && cache.has(exam.id)) return cache.get(exam.id);
  const config = await loadExamConfig(exam);
  const banks = await Promise.all(config.taskFiles.map(async (file) => {
    const path = `${exam.path.replace(/\/+$/, '')}/${file.replace(/^\/+/, '')}`;
    const response = await fetch(new URL(path, document.baseURI));
    if (!response.ok) throw new Error(`Не удалось загрузить банк ${file} для ${exam.id} (${response.status}).`);
    return response.json();
  }));
  const tasks = banks.flatMap((bank) => validateTaskBank(bank, exam.id));
  const ids = new Set();
  for (const task of tasks) {
    if (ids.has(task.id)) throw new TypeError(`Повторяющийся id задания между файлами: ${task.id}`);
    ids.add(task.id);
  }
  const data = { config, tasks, theory: banks.flatMap((bank) => bank.theory ?? []) };
  cache.set(exam.id, data);
  return data;
}

export async function loadTaskBank(exam, options) {
  return (await loadExamData(exam, options)).tasks;
}

export function clearTaskCache(examId) {
  if (examId) cache.delete(examId);
  else cache.clear();
}
