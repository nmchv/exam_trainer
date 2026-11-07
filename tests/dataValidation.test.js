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

test('rejects duplicate task identifiers and unsupported schema versions', () => {
  const task = { id: 'same', examId: 'demo', type: 'text', prompt: 'Synthetic task' };
  assert.throws(() => validateTaskBank({
    schemaVersion: '1.0.0', examId: 'demo', tasks: [task, task]
  }, 'demo'), /Повторяющийся id задания/);
  assert.throws(() => validateTaskBank({
    schemaVersion: '2.0.0', examId: 'demo', tasks: []
  }, 'demo'), /схеме 1.0.0/);
});
