import test from 'node:test';
import assert from 'node:assert/strict';
import { parseRoute } from '../src/core/router.js';
import { createState } from '../src/core/state.js';

test('parses safe hash routes and falls back for unknown pages', () => {
  assert.deepEqual(parseRoute('#/test/oge-geography'), { name: 'test', params: ['oge-geography'] });
  assert.deepEqual(parseRoute('#/not-a-page'), { name: 'home', params: [] });
});

test('state updates are immutable and notify subscribers', () => {
  const state = createState({ count: 1 });
  let observed = 0;
  state.subscribe((value) => { observed = value.count; });
  const next = state.update({ count: 2 });
  assert.equal(next.count, 2);
  assert.equal(observed, 2);
  assert.equal(state.get().count, 2);
});
