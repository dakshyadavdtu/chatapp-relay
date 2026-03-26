import { createServer } from 'node:http';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import WebSocket from 'ws';
import { createHttpHandler } from '../src/http/index.js';
import { attachWebSocket } from '../src/websocket/index.js';

test('websocket ping message gets pong', async () => {
  const server = createServer(createHttpHandler());
  attachWebSocket(server);

  await new Promise((resolve, reject) => {
    server.listen(0, (err) => (err ? reject(err) : resolve()));
  });

  const { port } = server.address();
  const ws = new WebSocket(`ws://127.0.0.1:${port}/`);

  await new Promise((resolve, reject) => {
    ws.once('open', resolve);
    ws.once('error', reject);
  });

  const reply = await new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error('timeout')), 3000);
    ws.once('message', (data) => {
      clearTimeout(t);
      resolve(JSON.parse(data.toString()));
    });
    ws.send(JSON.stringify({ type: 'ping' }));
  });

  assert.equal(reply.type, 'pong');
  assert.ok(typeof reply.ts === 'number');

  await new Promise((resolve, reject) => {
    ws.once('close', resolve);
    ws.close();
    setTimeout(() => reject(new Error('close timeout')), 3000);
  });

  await new Promise((resolve, reject) => {
    server.close((err) => (err ? reject(err) : resolve()));
  });
});

test('send message emits websocket message.created event', async () => {
  const server = createServer(createHttpHandler());
  attachWebSocket(server);

  await new Promise((resolve, reject) => {
    server.listen(0, (err) => (err ? reject(err) : resolve()));
  });

  const { port } = server.address();
  const ws = new WebSocket(`ws://127.0.0.1:${port}/`);
  await new Promise((resolve, reject) => {
    ws.once('open', resolve);
    ws.once('error', reject);
  });

  const waitEvent = new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error('event timeout')), 3000);
    ws.on('message', (data) => {
      const msg = JSON.parse(data.toString());
      if (msg?.type === 'message.created') {
        clearTimeout(t);
        resolve(msg);
      }
    });
  });

  const sendRes = await fetch(`http://127.0.0.1:${port}/api/chat/send`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ recipientId: 'u2', content: 'ws send test' }),
  });
  assert.equal(sendRes.status, 201);

  const evt = await waitEvent;
  assert.equal(evt.type, 'message.created');
  assert.equal(evt.message?.chatId, 'direct:u1:u2');
  assert.equal(evt.message?.recipientId, 'u2');
  assert.equal(evt.message?.senderId, 'u1');
  assert.equal(evt.message?.content, 'ws send test');

  await new Promise((resolve, reject) => {
    ws.once('close', resolve);
    ws.close();
    setTimeout(() => reject(new Error('close timeout')), 3000);
  });

  await new Promise((resolve, reject) => {
    server.close((err) => (err ? reject(err) : resolve()));
  });
});
