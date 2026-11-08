import test from 'node:test';
import assert from 'node:assert/strict';
import { createAttempt } from '../src/services/attemptService.js';
import { createUuid } from '../src/utils/uuid.js';

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

test('creates UUID v4 values using getRandomValues without randomUUID', () => {
  const cryptoApi = {
    getRandomValues(bytes) {
      bytes.fill(0);
      return bytes;
    }
  };
  assert.match(createUuid(cryptoApi), uuidPattern);
});

test('creates UUID v4 values when the crypto API is unavailable', () => {
  assert.match(createUuid(null), uuidPattern);
});

test('creates unique attempt and task IDs in UUID format', () => {
  const attempt = createAttempt({
    examId: 'oge-geography',
    mode: 'practice',
    tasks: [{ id: 'task-1' }, { id: 'task-2' }]
  });
  assert.match(attempt.id, uuidPattern);
  assert.match(attempt.attemptTaskIds['task-1'], uuidPattern);
  assert.match(attempt.attemptTaskIds['task-2'], uuidPattern);
  assert.notEqual(attempt.attemptTaskIds['task-1'], attempt.attemptTaskIds['task-2']);
});
