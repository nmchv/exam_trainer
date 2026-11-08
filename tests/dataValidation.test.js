import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { validateRegistry } from '../src/database/registryLoader.js';
import { validateTaskBank } from '../src/database/taskLoader.js';

test('validates the exam registry and unique IDs', () => {
  assert.doesNotThrow(() => validateRegistry({
    schemaVersion: '1.0.0',
    exams: [{ id: 'one', title: 'One', year: 2027, path: './one', enabled: true }]
  }));
  assert.throws(() => validateRegistry({
    schemaVersion: '1.0.0',
    exams: [
      { id: 'one', title: 'One', year: 2027, path: './one', enabled: true },
      { id: 'one', title: 'Another', year: 2027, path: './two', enabled: true }
    ]
  }), /Повторяющийся/);
});

test('validates demo bank while rejecting public real answer keys', async () => {
  const data = JSON.parse(await readFile(new URL('../public/database/oge/geography/tasks/demo.json', import.meta.url), 'utf8'));
  assert.equal(validateTaskBank(data, 'oge-geography').length, 9);
  assert.throws(() => validateTaskBank({
    schemaVersion: '1.0.0',
    examId: 'real',
    tasks: [{ id: 'secret', examId: 'real', type: 'text', prompt: 'Question', answer: 'secret' }]
  }, 'real'), /ответ.*только в Supabase/i);
});

test('loads 20 public first-task variants without answer keys or explanations', async () => {
  const data = JSON.parse(await readFile(new URL('../public/database/oge/geography/tasks/task01_variants.json', import.meta.url), 'utf8'));
  const tasks = validateTaskBank(data, 'oge-geography');
  const exam = JSON.parse(await readFile(new URL('../public/database/oge/geography/exam.json', import.meta.url), 'utf8'));
  const registry = JSON.parse(await readFile(new URL('../public/database/registry.json', import.meta.url), 'utf8'));
  assert.equal(tasks.length, 20);
  assert.equal(new Set(tasks.map((task) => task.id)).size, 20);
  assert.ok(tasks.every((task) => task.type === 'single_choice' && task.number === 1));
  assert.ok(tasks.every((task) => task.choices.length === 4));
  assert.ok(tasks.every((task) => !Object.hasOwn(task, 'answer') && !Object.hasOwn(task, 'explanation')));
  assert.deepEqual(exam.taskFiles, ['tasks/task01_variants.json']);
  assert.deepEqual(exam.taskSelection.sections, [{ type: 'single_choice', count: 1, maxScore: 1 }]);
  assert.equal(registry.exams.find((item) => item.id === 'oge-geography').demoOnly, undefined);
});

test('rejects duplicate task identifiers and unsupported schema versions', () => {
  const task = { id: 'same', examId: 'demo', type: 'text', prompt: 'Synthetic task' };
  assert.throws(() => validateTaskBank({
    schemaVersion: '1.0.0', examId: 'demo', tasks: [task, task]
  }, 'demo'), /Повторяющийся id задания/);
  assert.throws(() => validateTaskBank({
    schemaVersion: '2.0.0', examId: 'demo', tasks: []
  }, 'demo'), /схеме 1.0.0/);
});
