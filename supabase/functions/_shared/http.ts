export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

export function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

export function getBearerToken(request: Request): string | null {
  const header = request.headers.get('Authorization');
  return header?.startsWith('Bearer ') ? header.slice(7) : null;
}

export function normalizeAnswer(value: unknown, rules: Record<string, unknown> = {}): unknown {
  if (typeof value === 'string') {
    let result = rules.trim === false ? value : value.trim();
    if (rules.ignoreCase !== false) result = result.toLocaleLowerCase('ru');
    if (rules.ignoreWhitespace) result = result.replace(/\s+/g, '');
    if (rules.ignorePunctuation) result = result.replace(/[.,!?;:()[\]{}"']/g, '');
    return result;
  }
  if (Array.isArray(value)) {
    const items = value.map((item) => normalizeAnswer(item, rules));
    return rules.unordered ? items.sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b))) : items;
  }
  if (typeof value === 'number') return String(value);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).sort(([a], [b]) => a.localeCompare(b))
      .map(([key, item]) => [key, normalizeAnswer(item, rules)]));
  }
  return value;
}

export function checkAnswerValue(actual: unknown, answer: unknown, rules: Record<string, unknown> = {}) {
  if (rules.tolerance !== undefined) {
    const toNumber = (value: unknown) => Number(String(value ?? '').replace(',', '.'));
    const actualNumber = toNumber(actual);
    const expectedNumber = toNumber(answer);
    const correct = Number.isFinite(actualNumber) && Number.isFinite(expectedNumber)
      && Math.abs(actualNumber - expectedNumber) <= Number(rules.tolerance);
    return { correct, partial: correct ? 1 : 0 };
  }
  if (Array.isArray(answer) && typeof actual === 'string' && Array.isArray(rules.separators) && rules.separators.length) {
    actual = actual.split(new RegExp(rules.separators.map((value) =>
      String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    ).join('|'))).map((value) => value.trim());
  }
  const candidates = [answer, ...(Array.isArray(rules.alternatives) ? rules.alternatives : [])];
  const actualNormalized = JSON.stringify(normalizeAnswer(actual, rules));
  const correct = candidates.some((candidate) =>
    JSON.stringify(normalizeAnswer(candidate, rules)) === actualNormalized
  );
  let partial = correct ? 1 : 0;
  if (!correct && rules.partialCredit && Array.isArray(answer) && Array.isArray(actual)) {
    const expected = answer.map((item) => JSON.stringify(normalizeAnswer(item, rules)));
    const submitted = actual.map((item) => JSON.stringify(normalizeAnswer(item, rules)));
    const matching = expected.filter((item) => submitted.includes(item)).length;
    partial = Math.max(expected.length, submitted.length) ? matching / Math.max(expected.length, submitted.length) : 0;
  } else if (!correct && rules.partialCredit && answer && actual
    && typeof answer === 'object' && typeof actual === 'object'
    && !Array.isArray(answer) && !Array.isArray(actual)) {
    const entries = Object.entries(answer);
    const matching = entries.filter(([key, value]) =>
      JSON.stringify(normalizeAnswer(actual[key], rules)) === JSON.stringify(normalizeAnswer(value, rules))
    ).length;
    partial = Math.max(entries.length, Object.keys(actual).length)
      ? matching / Math.max(entries.length, Object.keys(actual).length) : 0;
  }
  return { correct, partial };
}
