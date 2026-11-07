function shuffle(items, random = Math.random) {
  const result = [...items];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(random() * (index + 1));
    [result[index], result[swap]] = [result[swap], result[index]];
  }
  return result;
}

export function generateTest(tasks, options = {}) {
  const {
    count = tasks.length,
    taskNumbers,
    tags,
    difficulty,
    mode = 'random',
    excludeIds = [],
    randomize = mode === 'random',
    random = Math.random
  } = options;
  if (!Array.isArray(tasks)) throw new TypeError('Список заданий должен быть массивом.');
  let candidates = tasks.filter((task) => !excludeIds.includes(task.id));
  if (taskNumbers?.length) {
    const selected = new Set(taskNumbers.map(String));
    candidates = candidates.filter((task) => selected.has(String(task.number)));
  }
  if (tags?.length) candidates = candidates.filter((task) => tags.every((tag) => task.tags?.includes(tag)));
  if (difficulty) candidates = candidates.filter((task) => task.difficulty === difficulty);
  if (mode === 'mistakes') candidates = candidates.filter((task) => options.mistakeIds?.includes(task.id));
  if (!['random', 'sequential', 'mistakes', 'selected'].includes(mode)) {
    throw new RangeError(`Неизвестный режим тренировки: ${mode}`);
  }
  if (!Number.isInteger(count) || count < 1) throw new RangeError('Количество заданий должно быть положительным числом.');
  const ordered = randomize ? shuffle(candidates, random) : candidates;
  const chosen = ordered.slice(0, count);
  if (chosen.length < count) throw new RangeError(`Найдено только ${chosen.length} заданий из запрошенных ${count}.`);
  return chosen;
}
