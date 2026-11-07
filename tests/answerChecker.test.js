import test from 'node:test';
import assert from 'node:assert/strict';
import { checkAnswer } from '../src/engines/answerChecker.js';

test('accepts case-insensitive text alternatives', () => {
  const task = { type: 'short_answer', answer: 'Пример', checkRules: { alternatives: ['образец'] } };
  assert.equal(checkAnswer(task, '  ОБРАЗЕЦ ').correct, true);
});

test('compares numbers with configured tolerance', () => {
  const task = { type: 'number', answer: 12.5, checkRules: { tolerance: 0.1 } };
  assert.equal(checkAnswer(task, '12,6').correct, true);
  assert.equal(checkAnswer(task, '13').correct, false);
});

test('checks multiple choices independent of order and awards partial credit', () => {
  const task = {
    type: 'multiple_choice', answer: ['a', 'c'], maxScore: 2,
    checkRules: { unordered: true, partialCredit: true }
  };
  const result = checkAnswer(task, ['a']);
  assert.equal(result.correct, false);
  assert.deepEqual(result.partialScores, [1]);
});

test('checks matching/table object values and exposes partial points', () => {
  const task = {
    type: 'matching', answer: { left: '1', right: '2' }, maxScore: 2,
    checkRules: { partialCredit: true }
  };
  const result = checkAnswer(task, { left: '1', right: '9' });
  assert.equal(result.correct, false);
  assert.deepEqual(result.partialScores, [1]);
});

test('accepts configured delimiters for list answers', () => {
  const task = { type: 'text', answer: ['north', 'south'], checkRules: { separators: [',', ';'], unordered: true } };
  assert.equal(checkAnswer(task, 'south, north').correct, true);
});

test('requires manual grading for rubric-only responses', () => {
  const result = checkAnswer({ type: 'text', manualCheck: true }, 'open response');
  assert.equal(result.manualReview, true);
  assert.equal(result.correct, null);
});

test('rejects unknown answer types', () => {
  assert.throws(() => checkAnswer({ type: 'custom' }, 'a'), /не поддерживается/);
});
