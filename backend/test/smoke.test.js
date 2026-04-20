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

function makePlainPost(url, body) {
  const stream = Readable.from([Buffer.from(body)]);
  stream.url = url;
  stream.method = 'POST';
  stream.headers = { 'content-type': 'text/plain' };
  return stream;
}

test('health service', () => {
  assert.deepEqual(getHealth(), { ok: true });
});

function makeRes() {
  return {
    statusCode: null,
    headers: {},
    body: null,
    setHeader(name, value) {
      this.headers[name] = value;
    },
    writeHead(statusCode, headers) {
      this.statusCode = statusCode;
      this.headers = { ...(this.headers || {}), ...headers };
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

test('POST /api/chats/:chatId/read accepts latest message id', async () => {
  const handler = createHttpHandler();
  const sendReq = makeJsonPost('/api/chats/direct%3Au1%3Au2/messages', {
    content: 'mark read contract',
    clientId: 'tmp_read_route',
  });
  const sendRes = makeRes();
  await handler(sendReq, sendRes);
  assert.equal(sendRes.statusCode, 201);
  const sentBody = JSON.parse(sendRes.body);
  const lastReadMessageId = sentBody.data?.message?.id;
  assert.ok(lastReadMessageId);

  const readReq = makeJsonPost('/api/chats/direct%3Au1%3Au2/read', { lastReadMessageId });
  const readRes = makeRes();
  await handler(readReq, readRes);

  assert.equal(readRes.statusCode, 200);
  const body = JSON.parse(readRes.body);
  assert.equal(body.success, true);
  assert.equal(body.data?.chatId, 'direct:u1:u2');
  assert.equal(body.data?.lastReadMessageId, lastReadMessageId);
  assert.equal(body.data?.unreadCount, 0);
});

test('POST /api/chats/:chatId/read rejects unknown message id', async () => {
  const handler = createHttpHandler();
  const req = makeJsonPost('/api/chats/direct%3Au1%3Au2/read', {
    lastReadMessageId: 'missing-read-message',
  });
  const res = makeRes();
  await handler(req, res);

  assert.equal(res.statusCode, 404);
  const body = JSON.parse(res.body);
  assert.equal(body.success, false);
  assert.equal(body.code, 'READ_MESSAGE_NOT_FOUND');
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

test('POST /api/login accepts basic credentials', async () => {
  const handler = createHttpHandler();
  const req = makeJsonPost('/api/login', { username: 'a', password: 'b' });
  const res = makeRes();

  await handler(req, res);

  assert.equal(res.statusCode, 200);
  const body = JSON.parse(res.body);
  assert.equal(body.success, true);
  assert.equal(body.data?.user?.username, 'a');
  assert.ok(res.headers['Set-Cookie']);
});

test('GET /api/me after login returns user', async () => {
  const handler = createHttpHandler();
  const loginReq = makeJsonPost('/api/login', { username: 'a', password: 'b' });
  const loginRes = makeRes();
  await handler(loginReq, loginRes);
  const cookie = loginRes.headers['Set-Cookie'];
  assert.ok(cookie);

  const meReq = { url: '/api/me', method: 'GET', headers: { cookie } };
  const meRes = makeRes();
  await handler(meReq, meRes);
  assert.equal(meRes.statusCode, 200);
  const body = JSON.parse(meRes.body);
  assert.equal(body.success, true);
  assert.equal(body.data?.user?.username, 'a');
});

test('POST /api/logout clears session', async () => {
  const handler = createHttpHandler();
  const loginReq = makeJsonPost('/api/login', { username: 'a', password: 'b' });
  const loginRes = makeRes();
  await handler(loginReq, loginRes);
  const cookie = loginRes.headers['Set-Cookie'];

  const logoutReq = makeJsonPost('/api/logout', {});
  logoutReq.headers.cookie = cookie;
  const logoutRes = makeRes();
  await handler(logoutReq, logoutRes);
  assert.equal(logoutRes.statusCode, 200);

  const meReq = { url: '/api/me', method: 'GET', headers: { cookie } };
  const meRes = makeRes();
  await handler(meReq, meRes);
  assert.equal(meRes.statusCode, 401);
});

test('POST /api/auth/login same as login', async () => {
  const handler = createHttpHandler();
  const req = makeJsonPost('/api/auth/login', { username: 'a', password: 'b' });
  const res = makeRes();

  await handler(req, res);

  assert.equal(res.statusCode, 200);
  const body = JSON.parse(res.body);
  assert.equal(body.data?.user?.username, 'a');
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
  assert.deepEqual(JSON.parse(res.body), { success: true, data: {} });
});

test('POST /api/register creates session', async () => {
  const handler = createHttpHandler();
  const req = makeJsonPost('/api/register', { username: 'x', password: 'pw' });
  const res = makeRes();

  await handler(req, res);

  assert.equal(res.statusCode, 201);
  const body = JSON.parse(res.body);
  assert.equal(body.success, true);
  assert.equal(body.data?.user?.username, 'x');
  assert.ok(res.headers['Set-Cookie']);
});

test('POST /api/register rejects missing fields', async () => {
  const handler = createHttpHandler();
  const req = makeJsonPost('/api/register', { username: 'x' });
  const res = makeRes();

  await handler(req, res);

  assert.equal(res.statusCode, 400);
  const body = JSON.parse(res.body);
  assert.equal(body.success, false);
  assert.equal(body.code, 'INVALID_CREDENTIALS');
});

test('POST /api/chat/send creates message', async () => {
  const handler = createHttpHandler();
  const req = makeJsonPost('/api/chat/send', { recipientId: 'u2', content: 'hi there' });
  const res = makeRes();

  await handler(req, res);

  assert.equal(res.statusCode, 201);
  const body = JSON.parse(res.body);
  assert.equal(body.success, true);
  assert.equal(body.data?.message?.id, body.data?.message?.messageId);
  assert.ok(typeof body.data?.message?.id === 'string');
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

test('POST /api/chat/send rejects missing recipientId', async () => {
  const handler = createHttpHandler();
  const req = makeJsonPost('/api/chat/send', { content: 'hello' });
  const res = makeRes();

  await handler(req, res);

  assert.equal(res.statusCode, 400);
  const body = JSON.parse(res.body);
  assert.equal(body.code, 'INVALID_PAYLOAD');
});

test('POST /api/chat/send rejects unsupported content-type', async () => {
  const handler = createHttpHandler();
  const req = makePlainPost('/api/chat/send', 'hello');
  const res = makeRes();

  await handler(req, res);

  assert.equal(res.statusCode, 415);
  const body = JSON.parse(res.body);
  assert.equal(body.code, 'UNSUPPORTED_MEDIA_TYPE');
});
