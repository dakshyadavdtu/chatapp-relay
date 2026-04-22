import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  createSession,
  deleteSession,
  getSessionByToken,
  resetSessionsForTest,
  touchSession,
} from '../src/auth/session.js';

async function withTtl(ms, fn) {
  const prev = process.env.SESSION_TTL_MS;
  process.env.SESSION_TTL_MS = String(ms);
  try {
    await fn();
  } finally {
    if (prev === undefined) delete process.env.SESSION_TTL_MS;
    else process.env.SESSION_TTL_MS = prev;
  }
}

test('session expires after ttl', async () => {
  resetSessionsForTest();
  await withTtl(30, async () => {
    const { token } = createSession({ id: 'u1', username: 'u1' });
    assert.ok(getSessionByToken(token));
    await new Promise((r) => setTimeout(r, 80));
    assert.equal(getSessionByToken(token), null);
  });
});

test('touch extends session lifetime', async () => {
  resetSessionsForTest();
  const { token } = createSession({ id: 'u2', username: 'u2' });
  await withTtl(40, async () => {
    await new Promise((r) => setTimeout(r, 25));
    touchSession(token);
    await new Promise((r) => setTimeout(r, 25));
    assert.ok(getSessionByToken(token));
  });
  deleteSession(token);
});
