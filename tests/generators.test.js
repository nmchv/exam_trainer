import test from 'node:test';
import assert from 'node:assert/strict';
import { generateExam } from '../src/engines/examGenerator.js';
import { generateTest } from '../src/engines/testGenerator.js';

const tasks = [
  { id: 'a', number: 1, type: 'single_choice', tags: ['land'], maxScore: 1 },
  { id: 'b', number: 2, type: 'single_choice', tags: ['water'], maxScore: 1 },
  { id: 'c', number: 3, type: 'number', tags: ['land'], maxScore: 2 },
  { id: 'd', number: 4, type: 'number', tags: ['land'], maxScore: 1 },
  { id: 'e', number: 5, type: 'matching', groupId: 'related', maxScore: 1 },
  { id: 'f', number: 6, type: 'matching', groupId: 'related', dependsOn: ['e'], maxScore: 1 }
];

test('generates filtered tests without repeated questions', () => {
  const result = generateTest(tasks, { count: 2, mode: 'random', tags: ['land'], random: () => 0 });
  assert.equal(result.length, 2);
  assert.equal(new Set(result.map((task) => task.id)).size, 2);
  assert.ok(result.every((task) => task.tags.includes('land')));
});

test('supports explicit numbers and prior-error mode', () => {
  assert.deepEqual(generateTest(tasks, { count: 1, mode: 'selected', taskNumbers: ['2'] }).map((task) => task.id), ['b']);
  assert.deepEqual(generateTest(tasks, { count: 1, mode: 'mistakes', mistakeIds: ['d'] }).map((task) => task.id), ['d']);
});

test('reports when filters cannot satisfy requested count', () => {
  assert.throws(() => generateTest(tasks, { count: 3, mode: 'selected', taskNumbers: ['2'] }), /Найдено только/);
});

test('builds a full variant with grouped tasks and dependency order', () => {
  const result = generateExam(tasks, {
    examId: 'demo',
    sections: [
      { type: 'single_choice', count: 1 },
      { type: 'matching', count: 2 }
    ]
  }, { random: () => 0 });
  assert.equal(new Set(result.tasks.map((task) => task.id)).size, 3);
  assert.ok(result.tasks.findIndex((task) => task.id === 'e') < result.tasks.findIndex((task) => task.id === 'f'));
});

test('supports fixed variants and rejects missing dependency targets', () => {
  assert.deepEqual(generateExam(tasks, { examId: 'demo', fixedTaskIds: ['c', 'a'], sections: [] }).tasks.map((task) => task.id), ['c', 'a']);
  assert.throws(() => generateExam([{ id: 'a', type: 'number', dependsOn: ['missing'] }], {
    examId: 'demo', sections: [{ type: 'number', count: 1 }]
  }), /отсутствует зависимость/);
});
