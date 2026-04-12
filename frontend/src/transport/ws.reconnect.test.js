import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getConnectionState, setConnectionStatus } from './connectionState.js';
import { startJsonSocket } from './ws.js';

class MockWebSocket {
  static instances = [];
  static OPEN = 1;

  constructor(_url) {
    this.readyState = 0;
    this.listeners = {
      open: [],
      close: [],
      message: [],
    };
    MockWebSocket.instances.push(this);
  }

  addEventListener(type, fn) {
    this.listeners[type]?.push(fn);
  }

  removeEventListener(type, fn) {
    const list = this.listeners[type];
    if (!Array.isArray(list)) {
      return;
    }
    this.listeners[type] = list.filter((row) => row !== fn);
  }

  send() {}

  close() {
    this.emit('close', { code: 1000, reason: 'manual', wasClean: true });
  }

  emit(type, payload) {
    const list = this.listeners[type] ?? [];
    for (const fn of list) {
      fn(payload);
    }
  }

  open() {
    this.readyState = MockWebSocket.OPEN;
    this.emit('open', {});
  }
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

test('startJsonSocket reconnects after recoverable close', async () => {
  const RealWebSocket = globalThis.WebSocket;
  const realRandom = Math.random;
  globalThis.WebSocket = MockWebSocket;
  Math.random = () => 0;
  MockWebSocket.instances = [];
  setConnectionStatus('disconnected', {
    reconnectAttempt: 0,
    nextRetryMs: null,
    closeCode: null,
    closeReason: '',
    wasClean: false,
    recoveredAt: null,
  });

  const session = startJsonSocket({});
  assert.equal(MockWebSocket.instances.length, 1);
  MockWebSocket.instances[0].open();
  MockWebSocket.instances[0].emit('close', { code: 1006, reason: 'network', wasClean: false });
  assert.equal(getConnectionState().status, 'reconnecting');
  await wait(1100);
  assert.equal(MockWebSocket.instances.length, 2);

  session.stop();
  globalThis.WebSocket = RealWebSocket;
  Math.random = realRandom;
});

test('startJsonSocket stops retry on auth close', async () => {
  const RealWebSocket = globalThis.WebSocket;
  globalThis.WebSocket = MockWebSocket;
  MockWebSocket.instances = [];
  let authClose = null;

  const session = startJsonSocket({
    onAuthClose(payload) {
      authClose = payload;
    },
  });
  assert.equal(MockWebSocket.instances.length, 1);
  MockWebSocket.instances[0].open();
  MockWebSocket.instances[0].emit('close', { code: 4401, reason: 'unauthorized', wasClean: true });
  assert.equal(getConnectionState().status, 'auth_failed');
  await wait(1100);
  assert.equal(MockWebSocket.instances.length, 1);
  assert.equal(authClose?.closeCode, 4401);

  session.stop();
  globalThis.WebSocket = RealWebSocket;
});
