import test from 'node:test';
import assert from 'node:assert/strict';
import { scoreAttempt } from '../src/engines/scoringEngine.js';

test('calculates partial score, percentage and configuration-based grade', () => {
  const result = scoreAttempt([
    { task: { id: 'a', maxScore: 2 }, result: { correct: false, partialScores: [1] } },
    { task: { id: 'b', maxScore: 1 }, result: { correct: true } }
  ], { gradeScale: [{ min: 0, max: 1, grade: 2 }, { min: 2, max: 3, grade: 5 }] });
  assert.equal(result.score, 2);
  assert.equal(result.maxScore, 3);
  assert.equal(result.percentage, 67);
  assert.equal(result.grade, 5);
});

test('does not silently award points for manual review', () => {
  const result = scoreAttempt([{ task: { id: 'a', maxScore: 2 }, result: { manualReview: true, correct: null } }]);
  assert.equal(result.score, 0);
  assert.equal(result.results[0].correct, null);
});
