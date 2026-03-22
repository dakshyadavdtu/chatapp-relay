import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getHealth } from '../src/services/health.js';

test('health service', () => {
  assert.deepEqual(getHealth(), { ok: true });
});
