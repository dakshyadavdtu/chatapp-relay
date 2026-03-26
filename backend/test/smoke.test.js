import { Readable } from 'node:stream';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getHealth } from '../src/services/health.js';
import { createHttpHandler } from '../src/http/index.js';

function makeJsonPost(url, payload) {
  const json = JSON.stringify(payload);
  const stream = Readable.from([Buffer.from(json)]);
  stream.url = url;
  stream.method = 'POST';
  stream.headers = { 'content-type': 'application/json' };
  return stream;
}

test('health service', () => {
  assert.deepEqual(getHealth(), { ok: true });
});

function makeRes() {
  return {
    statusCode: null,
    headers: null,
    body: null,
    writeHead(statusCode, headers) {
      this.statusCode = statusCode;
      this.headers = headers;
    },
    end(body) {
      this.body = body;
    },
  };
}

test('http route /', async () => {
  const handler = createHttpHandler();
  const req = { url: '/' };
  const res = makeRes();

  await handler(req, res);

  assert.equal(res.statusCode, 200);
  assert.deepEqual(res.headers, { 'Content-Type': 'text/plain; charset=utf-8' });
  assert.equal(res.body, 'ok\n');
});

test('http route /health', async () => {
  const handler = createHttpHandler();
  const req = { url: '/health' };
  const res = makeRes();

  await handler(req, res);

  assert.equal(res.statusCode, 200);
  assert.deepEqual(res.headers, { 'Content-Type': 'text/plain; charset=utf-8' });
  assert.equal(res.body, 'ok\n');
});

test('http route /health with query', async () => {
  const handler = createHttpHandler();
  const req = { url: '/health?x=1' };
  const res = makeRes();

  await handler(req, res);

  assert.equal(res.statusCode, 200);
  assert.deepEqual(res.headers, { 'Content-Type': 'text/plain; charset=utf-8' });
  assert.equal(res.body, 'ok\n');
});

test('http route /api/health', async () => {
  const handler = createHttpHandler();
  const req = { url: '/api/health', method: 'GET' };
  const res = makeRes();

  await handler(req, res);

  assert.equal(res.statusCode, 200);
  assert.equal(res.headers['Content-Type'], 'application/json; charset=utf-8');
  assert.deepEqual(JSON.parse(res.body), { success: true, data: { ok: true } });
});

test('http route /api/me unauthenticated', async () => {
  const handler = createHttpHandler();
  const req = { url: '/api/me', method: 'GET' };
  const res = makeRes();

  await handler(req, res);

  assert.equal(res.statusCode, 401);
  assert.equal(res.headers['Content-Type'], 'application/json; charset=utf-8');
  const body = JSON.parse(res.body);
  assert.equal(body.success, false);
  assert.equal(body.code, 'UNAUTHORIZED');
});

test('http route 404', async () => {
  const handler = createHttpHandler();
  const req = { url: '/nope' };
  const res = makeRes();

  await handler(req, res);

  assert.equal(res.statusCode, 404);
  assert.deepEqual(res.headers, { 'Content-Type': 'text/plain; charset=utf-8' });
  assert.equal(res.body, 'not found\n');
});

test('GET /api/chats returns list', async () => {
  const handler = createHttpHandler();
  const req = { url: '/api/chats', method: 'GET' };
  const res = makeRes();

  await handler(req, res);

  assert.equal(res.statusCode, 200);
  assert.equal(res.headers['Content-Type'], 'application/json; charset=utf-8');
  const body = JSON.parse(res.body);
  assert.equal(body.success, true);
  assert.equal(Array.isArray(body.data?.chats), true);
});

test('GET /api/chats/:chatId returns one chat', async () => {
  const handler = createHttpHandler();
  const req = { url: '/api/chats/direct%3Au1%3Au2', method: 'GET' };
  const res = makeRes();

  await handler(req, res);

  assert.equal(res.statusCode, 200);
  const body = JSON.parse(res.body);
  assert.equal(body.success, true);
  assert.equal(body.data?.chat?.chatId, 'direct:u1:u2');
});

test('GET /api/chats/:chatId 404 when missing', async () => {
  const handler = createHttpHandler();
  const req = { url: '/api/chats/unknown-chat', method: 'GET' };
  const res = makeRes();

  await handler(req, res);

  assert.equal(res.statusCode, 404);
  const body = JSON.parse(res.body);
  assert.equal(body.code, 'CHAT_NOT_FOUND');
});

test('GET /api/chats/:chatId/messages returns shaped payload', async () => {
  const handler = createHttpHandler();
  const req = { url: '/api/chats/direct%3Au1%3Au2/messages', method: 'GET' };
  const res = makeRes();

  await handler(req, res);

  assert.equal(res.statusCode, 200);
  const body = JSON.parse(res.body);
  assert.equal(body.success, true);
  assert.equal(Array.isArray(body.data?.messages), true);
  assert.equal(body.data?.meta?.limit, 50);
  assert.equal(body.data?.meta?.beforeTs, null);
  assert.equal(typeof body.data?.meta?.count, 'number');
});

test('GET /api/chats/:chatId/messages 404 when chat missing', async () => {
  const handler = createHttpHandler();
  const req = { url: '/api/chats/unknown-chat/messages', method: 'GET' };
  const res = makeRes();

  await handler(req, res);

  assert.equal(res.statusCode, 404);
  const body = JSON.parse(res.body);
  assert.equal(body.code, 'CHAT_NOT_FOUND');
});

test('POST /api/login rejects missing fields', async () => {
  const handler = createHttpHandler();
  const req = makeJsonPost('/api/login', {});
  const res = makeRes();

  await handler(req, res);

  assert.equal(res.statusCode, 400);
  const body = JSON.parse(res.body);
  assert.equal(body.success, false);
  assert.equal(body.code, 'INVALID_CREDENTIALS');
});

test('POST /api/login rejects credentials until wired', async () => {
  const handler = createHttpHandler();
  const req = makeJsonPost('/api/login', { username: 'a', password: 'b' });
  const res = makeRes();

  await handler(req, res);

  assert.equal(res.statusCode, 401);
  const body = JSON.parse(res.body);
  assert.equal(body.success, false);
  assert.equal(body.code, 'INVALID_CREDENTIALS');
});

test('POST /api/auth/login same as login', async () => {
  const handler = createHttpHandler();
  const req = makeJsonPost('/api/auth/login', { username: 'a', password: 'b' });
  const res = makeRes();

  await handler(req, res);

  assert.equal(res.statusCode, 401);
  const body = JSON.parse(res.body);
  assert.equal(body.code, 'INVALID_CREDENTIALS');
});

test('POST /api/auth/refresh unauthenticated', async () => {
  const handler = createHttpHandler();
  const req = makeJsonPost('/api/auth/refresh', {});
  const res = makeRes();

  await handler(req, res);

  assert.equal(res.statusCode, 401);
  const body = JSON.parse(res.body);
  assert.equal(body.code, 'UNAUTHORIZED');
});

test('POST /api/logout', async () => {
  const handler = createHttpHandler();
  const req = makeJsonPost('/api/logout', {});
  const res = makeRes();

  await handler(req, res);

  assert.equal(res.statusCode, 200);
  assert.deepEqual(JSON.parse(res.body), { success: true, data: { ok: true } });
});

test('POST /api/register not implemented', async () => {
  const handler = createHttpHandler();
  const req = makeJsonPost('/api/register', { username: 'x' });
  const res = makeRes();

  await handler(req, res);

  assert.equal(res.statusCode, 501);
  const body = JSON.parse(res.body);
  assert.equal(body.code, 'NOT_IMPLEMENTED');
});

test('POST /api/chat/send creates message', async () => {
  const handler = createHttpHandler();
  const req = makeJsonPost('/api/chat/send', { recipientId: 'u2', content: 'hi there' });
  const res = makeRes();

  await handler(req, res);

  assert.equal(res.statusCode, 201);
  const body = JSON.parse(res.body);
  assert.equal(body.success, true);
  assert.equal(body.data?.message?.recipientId, 'u2');
  assert.equal(body.data?.message?.content, 'hi there');
});

test('POST /api/chat/send rejects long content', async () => {
  const handler = createHttpHandler();
  const req = makeJsonPost('/api/chat/send', {
    recipientId: 'u2',
    content: 'x'.repeat(2001),
  });
  const res = makeRes();

  await handler(req, res);

  assert.equal(res.statusCode, 400);
  const body = JSON.parse(res.body);
  assert.equal(body.code, 'CONTENT_TOO_LONG');
});
