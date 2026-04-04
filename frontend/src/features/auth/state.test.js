import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  authState,
  applySessionResult,
  setAuthUser,
  loadSession,
  performLogin,
  performLogout,
} from './state.js';

function resetAuthState() {
  authState.status = 'unknown';
  authState.user = null;
  authState.sessionChecked = false;
  authState.sessionError = null;
  authState.loginStatus = 'idle';
  authState.loginError = null;
  authState.logoutStatus = 'idle';
  authState.logoutError = null;
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
  global.fetch = async () => ({
    ok: true,
    status: 200,
    async json() {
      return { success: true, data: { user: { id: 'u1', username: 'u1' } } };
    },
  });
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
  global.fetch = async () => ({
    ok: false,
    status: 401,
    async json() {
      return { success: false, code: 'UNAUTHORIZED' };
    },
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

test('performLogin updates state and resets loginStatus', async () => {
  resetAuthState();
  const originalFetch = global.fetch;
  global.fetch = async (input, init = {}) => {
    const url = typeof input === 'string' ? input : input?.url ?? '';
    if (url.includes('/api/login')) {
      return {
        ok: true,
        status: 200,
        async json() {
          return { success: true, data: { user: { id: 'u1', username: 'u1' } } };
        },
      };
    }
    if (url.includes('/api/me')) {
      return {
        ok: true,
        status: 200,
        async json() {
          return { success: true, data: { user: { id: 'u1', username: 'u1' } } };
        },
      };
    }
    throw new Error(`unexpected fetch ${url}`);
  };
  try {
    await performLogin('u1', 'pw');
    assert.equal(authState.status, 'signed_in');
    assert.equal(authState.user.username, 'u1');
    assert.equal(authState.loginStatus, 'idle');
    assert.equal(authState.loginError, null);
  } finally {
    global.fetch = originalFetch;
  }
});

test('performLogout clears user and sets logoutStatus', async () => {
  resetAuthState();
  setAuthUser({ id: 'u1', username: 'u1' });
  const originalFetch = global.fetch;
  global.fetch = async (input) => {
    const url = typeof input === 'string' ? input : input?.url ?? '';
    if (url.includes('/api/logout')) {
      return {
        ok: true,
        status: 200,
        async json() {
          return { success: true, data: {} };
        },
      };
    }
    if (url.includes('/api/me')) {
      return {
        ok: false,
        status: 401,
        async json() {
          return { success: false, code: 'UNAUTHORIZED' };
        },
      };
    }
    throw new Error(`unexpected fetch ${url}`);
  };
  try {
    await performLogout();
    assert.equal(authState.status, 'signed_out');
    assert.equal(authState.user, null);
    assert.equal(authState.logoutStatus, 'idle');
  } finally {
    global.fetch = originalFetch;
  }
});
