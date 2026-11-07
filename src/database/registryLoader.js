import { REGISTRY_PATH } from '../config.js';

export function validateRegistry(data) {
  if (!data || typeof data !== 'object' || !Array.isArray(data.exams)) {
    throw new TypeError('Реестр экзаменов должен содержать массив exams.');
  }
  if (data.schemaVersion !== '1.0.0') throw new TypeError('Реестр экзаменов имеет неподдерживаемую версию схемы.');
  const ids = new Set();
  for (const exam of data.exams) {
    if (!exam || typeof exam.id !== 'string' || !exam.id.trim()) {
      throw new TypeError('Каждый экзамен в реестре должен иметь непустой id.');
    }
    if (ids.has(exam.id)) throw new TypeError(`Повторяющийся id экзамена: ${exam.id}`);
    if (typeof exam.path !== 'string' || typeof exam.enabled !== 'boolean'
      || typeof exam.title !== 'string' || !Number.isInteger(exam.year)) {
      throw new TypeError(`У экзамена ${exam.id} должны быть title, year, path и enabled.`);
    }
    ids.add(exam.id);
  }
  return data;
}

export async function loadRegistry(path = REGISTRY_PATH) {
  const response = await fetch(new URL(path, document.baseURI));
  if (!response.ok) throw new Error(`Не удалось загрузить реестр экзаменов (${response.status}).`);
  return validateRegistry(await response.json());
}

export function getEnabledExams(registry) {
  return registry.exams.filter((exam) => exam.enabled);
}
