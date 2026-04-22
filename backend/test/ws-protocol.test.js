import { createServer } from 'node:http';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import WebSocket from 'ws';
import { createHttpHandler } from '../src/http/index.js';
import { attachWebSocket } from '../src/websocket/index.js';
import { resetConnectionsForTest } from '../src/websocket/connections.js';

async function loginOrRegister(port, username) {
  const reg = await fetch(`http://127.0.0.1:${port}/api/register`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ username, password: 'pw1234' }),
  });
  if (reg.status === 201) {
    return { status: reg.status, cookie: reg.headers.get('set-cookie') };
  }
  const login = await fetch(`http://127.0.0.1:${port}/api/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ username, password: 'pw1234' }),
  });
  return { status: login.status, cookie: login.headers.get('set-cookie') };
}

function startServer() {
  return new Promise((resolve, reject) => {
    const server = createServer(createHttpHandler());
    attachWebSocket(server);
    server.listen(0, (err) => (err ? reject(err) : resolve(server)));
  });
}

function open(ws) {
  return new Promise((resolve, reject) => {
    ws.once('open', resolve);
    ws.once('error', reject);
  });
}

function nextJson(ws, predicate) {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error('timeout')), 3000);
    function onMsg(data) {
      let parsed;
      try {
        parsed = JSON.parse(data.toString());
      } catch {
        return;
      }
      if (!predicate || predicate(parsed)) {
        clearTimeout(t);
        ws.off('message', onMsg);
        resolve(parsed);
      }
    }
    ws.on('message', onMsg);
  });
}

function close(ws) {
  return new Promise((resolve) => {
    ws.once('close', () => resolve());
    ws.close();
    setTimeout(() => resolve(), 1500);
  });
}

test('HELLO receives HELLO_ACK with protocol version', async () => {
  resetConnectionsForTest();
  const server = await startServer();
  const { port } = server.address();
  const ws = new WebSocket(`ws://127.0.0.1:${port}/ws`);
  await open(ws);

  ws.send(JSON.stringify({ type: 'HELLO' }));
  const ack = await nextJson(ws, (m) => m?.type === 'HELLO_ACK');
  assert.equal(ack.type, 'HELLO_ACK');
  assert.equal(typeof ack.version, 'number');

  await close(ws);
  await new Promise((r) => server.close(() => r()));
});

test('uppercase PING receives PONG', async () => {
  resetConnectionsForTest();
  const server = await startServer();
  const { port } = server.address();
  const ws = new WebSocket(`ws://127.0.0.1:${port}/ws`);
  await open(ws);

  ws.send(JSON.stringify({ type: 'PING' }));
  const pong = await nextJson(ws, (m) => m?.type === 'PONG');
  assert.equal(pong.type, 'PONG');

  await close(ws);
  await new Promise((r) => server.close(() => r()));
});

test('TYPING_START is broadcast to the other chat member', async () => {
  resetConnectionsForTest();
  const server = await startServer();
  const { port } = server.address();

  const u1 = await loginOrRegister(port, 'u1');
  const u2 = await loginOrRegister(port, 'u2');
  assert.equal(u1.status === 201 || u1.status === 409, true);
  assert.equal(u2.status === 201 || u2.status === 409, true);

  const a = new WebSocket(`ws://127.0.0.1:${port}/ws`, {
    headers: { cookie: u1.cookie },
  });
  await open(a);
  const b = new WebSocket(`ws://127.0.0.1:${port}/ws`, {
    headers: { cookie: u2.cookie },
  });
  await open(b);

  await new Promise((r) => setTimeout(r, 40));

  const waitTyping = nextJson(b, (m) => m?.type === 'TYPING_START');
  a.send(JSON.stringify({ type: 'TYPING_START', chatId: 'direct:u1:u2' }));

  const evt = await waitTyping;
  assert.equal(evt.type, 'TYPING_START');
  assert.equal(evt.chatId, 'direct:u1:u2');
  assert.equal(evt.userId, 'u1');

  await close(a);
  await close(b);
  await new Promise((r) => server.close(() => r()));
});

test('MESSAGE_READ notifies the sender with a state update', async () => {
  resetConnectionsForTest();
  const server = await startServer();
  const { port } = server.address();

  const u1 = await loginOrRegister(port, 'u1');
  const u2 = await loginOrRegister(port, 'u2');

  const a = new WebSocket(`ws://127.0.0.1:${port}/ws`, {
    headers: { cookie: u1.cookie },
  });
  await open(a);
  const b = new WebSocket(`ws://127.0.0.1:${port}/ws`, {
    headers: { cookie: u2.cookie },
  });
  await open(b);
  await new Promise((r) => setTimeout(r, 40));

  const waitReceive = nextJson(b, (m) => m?.type === 'MESSAGE_RECEIVE');
  const sendRes = await fetch(`http://127.0.0.1:${port}/api/chat/send`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', cookie: u1.cookie },
    body: JSON.stringify({ recipientId: 'u2', content: 'hello u2' }),
  });
  assert.equal(sendRes.status, 201);
  const recv = await waitReceive;
  const mid = recv.message?.id ?? recv.messageId;
  assert.ok(mid);

  const waitState = nextJson(a, (m) => m?.type === 'MESSAGE_STATE_UPDATE');
  b.send(JSON.stringify({ type: 'MESSAGE_READ', messageId: mid }));
  const state = await waitState;
  assert.equal(state.type, 'MESSAGE_STATE_UPDATE');
  assert.equal(state.state, 'READ');
  assert.equal(state.messageId, mid);

  await close(a);
  await close(b);
  await new Promise((r) => server.close(() => r()));
});

test('PRESENCE_LIST returns a snapshot of online users', async () => {
  resetConnectionsForTest();
  const server = await startServer();
  const { port } = server.address();
  const ws = new WebSocket(`ws://127.0.0.1:${port}/ws`);
  await open(ws);

  await new Promise((r) => setTimeout(r, 30));
  ws.send(JSON.stringify({ type: 'PRESENCE_LIST' }));
  const snap = await nextJson(ws, (m) => m?.type === 'PRESENCE_SNAPSHOT');
  assert.equal(snap.type, 'PRESENCE_SNAPSHOT');
  assert.ok(Array.isArray(snap.users));

  await close(ws);
  await new Promise((r) => server.close(() => r()));
});
