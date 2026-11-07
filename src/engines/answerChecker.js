const SUPPORTED = new Set([
  'single_choice', 'multiple_choice', 'text', 'number',
  'matching', 'ordering', 'short_answer', 'table', 'map'
]);

function normalizeText(value, rules = {}) {
  let text = String(value ?? '');
  const separators = Array.isArray(rules.separators) ? rules.separators : [];
  for (const separator of separators) {
    if (typeof separator === 'string' && separator) text = text.split(separator).join(' ');
  }
  if (rules.trim !== false) text = text.trim();
  if (rules.ignoreCase !== false) text = text.toLocaleLowerCase('ru');
  if (rules.ignoreWhitespace) text = text.replace(/\s+/g, '');
  if (rules.ignorePunctuation) text = text.replace(/[.,!?;:()[\]{}"']/g, '');
  return text;
}

function sameArray(actual, expected) {
  return Array.isArray(actual) && Array.isArray(expected)
    && actual.length === expected.length
    && expected.every((value, index) => String(actual[index]) === String(value));
}

function checkValue(actual, expected, rules = {}) {
  if (expected === undefined) return { correct: false, manualReview: true, score: 0 };
  if (rules.tolerance !== undefined) {
    const actualNumber = Number(String(actual ?? '').replace(',', '.'));
    const expectedNumber = Number(String(expected ?? '').replace(',', '.'));
    const correct = Number.isFinite(actualNumber) && Number.isFinite(expectedNumber)
      && Math.abs(actualNumber - expectedNumber) <= Number(rules.tolerance);
    return { correct, score: correct ? 1 : 0 };
  }
  if (actual && expected && typeof actual === 'object' && typeof expected === 'object'
    && !Array.isArray(actual) && !Array.isArray(expected)) {
    const keys = Object.keys(expected);
    const matches = keys.filter((key) => normalizeText(actual[key], rules) === normalizeText(expected[key], rules)).length;
    const correct = matches === keys.length && Object.keys(actual).length === keys.length;
    return {
      correct,
      score: correct ? 1 : 0,
      partialScores: rules.partialCredit && !correct
        ? [Math.max(keys.length, Object.keys(actual).length) ? matches / Math.max(keys.length, Object.keys(actual).length) : 0]
        : undefined
    };
  }
  if (Array.isArray(expected)) {
    if (typeof actual === 'string' && Array.isArray(rules.separators) && rules.separators.length) {
      actual = actual.split(new RegExp(rules.separators.map(escapeRegExp).join('|'))).map((value) => value.trim());
    }
    const correct = rules.unordered
      ? Array.isArray(actual) && actual.length === expected.length
        && [...actual].map(String).sort().join('\u0000') === [...expected].map(String).sort().join('\u0000')
      : sameArray(actual, expected);
    const matches = Array.isArray(actual)
      ? expected.filter((value) => actual.map(String).includes(String(value))).length
      : 0;
    return {
      correct,
      score: correct ? 1 : 0,
      partialScores: rules.partialCredit && !correct
        ? [Math.max(expected.length, Array.isArray(actual) ? actual.length : 0)
          ? matches / Math.max(expected.length, Array.isArray(actual) ? actual.length : 0) : 0]
        : undefined
    };
  }
  const answers = [expected, ...(rules.alternatives ?? [])];
  const correct = answers.some((answer) => normalizeText(actual, rules) === normalizeText(answer, rules));
  return { correct, score: correct ? 1 : 0 };
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function checkAnswer(task, answer) {
  if (!SUPPORTED.has(task?.type)) {
    throw new RangeError(`Тип задания «${task?.type ?? 'неизвестен'}» не поддерживается проверкой.`);
  }
  if (task.manualCheck || task.answer === undefined) {
    return { correct: null, manualReview: true, score: 0, feedback: 'Ответ требует ручной проверки.' };
  }
  const rules = task.checkRules ?? {};
  const result = checkValue(answer, task.answer, rules);
  const maxScore = Number(task.maxScore ?? 1);
  const partialScores = result.partialScores?.map((score) => score * maxScore);
  return {
    ...result,
    ...(partialScores ? { partialScores } : {}),
    feedback: result.correct ? 'Верно.' : 'Пока неверно.',
    explanation: task.explanation ?? ''
  };
}
