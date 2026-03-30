import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  registerUserConnection,
  removeUserConnection,
  getConnectionsForUser,
  isUserOnline,
} from '../src/websocket/connections.js';

test('register and lookup user connections', () => {
  const ctx1 = { id: 'c1' };
  const ctx2 = { id: 'c2' };
  registerUserConnection('u1', ctx1);
  registerUserConnection('u1', ctx2);
  registerUserConnection('u2', ctx1);

  const u1Conns = getConnectionsForUser('u1');
  assert.equal(u1Conns.size, 2);
  assert.equal(u1Conns.has(ctx1), true);
  assert.equal(u1Conns.has(ctx2), true);

  assert.equal(isUserOnline('u1'), true);
  assert.equal(isUserOnline('u2'), true);
  assert.equal(isUserOnline('u99'), false);
});

test('remove user connection cleans up', () => {
  const ctx = { id: 'c3' };
  registerUserConnection('u3', ctx);
  assert.equal(isUserOnline('u3'), true);
  removeUserConnection('u3', ctx);
  assert.equal(isUserOnline('u3'), false);
  assert.equal(getConnectionsForUser('u3').size, 0);
});

test('getConnectionsForUser returns empty set for unknown user', () => {
  const conns = getConnectionsForUser('nobody');
  assert.equal(conns.size, 0);
});
