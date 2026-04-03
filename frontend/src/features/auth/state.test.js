import { test } from 'node:test';
import assert from 'node:assert/strict';
import { authState, applySessionResult, setAuthUser, loadSession } from './state.js';

function resetAuthState() {
  authState.status = 'unknown';
  authState.user = null;
  authState.sessionChecked = false;
  authState.sessionError = null;
}

test('applySessionResult sets signed in', () => {
  resetAuthState();
  applySessionResult({ authenticated: true, user: { id: 'u1', username: 'u1' } });
  assert.equal(authState.status, 'signed_in');
  assert.equal(authState.user.id, 'u1');
});

test('applySessionResult sets signed out when unauthenticated', () => {
  resetAuthState();
  applySessionResult({ authenticated: false });
  assert.equal(authState.status, 'signed_out');
  assert.equal(authState.user, null);
});

test('loadSession handles authenticated response', async () => {
  resetAuthState();
  const originalFetch = global.fetch;
  global.fetch = async () =>
    new Response(
      JSON.stringify({ success: true, data: { user: { id: 'u1', username: 'u1' } } }),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    );
  try {
    await loadSession();
    assert.equal(authState.status, 'signed_in');
    assert.equal(authState.user.username, 'u1');
    assert.equal(authState.sessionChecked, true);
  } finally {
    global.fetch = originalFetch;
  }
});

test('loadSession handles unauthorized response', async () => {
  resetAuthState();
  const originalFetch = global.fetch;
  global.fetch = async () =>
    new Response(JSON.stringify({ success: false, code: 'UNAUTHORIZED' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  try {
    await loadSession();
    assert.equal(authState.status, 'signed_out');
    assert.equal(authState.user, null);
    assert.equal(authState.sessionChecked, true);
  } finally {
    global.fetch = originalFetch;
  }
});
