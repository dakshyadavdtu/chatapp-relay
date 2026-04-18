import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Readable } from 'node:stream';
import { createHttpHandler } from '../src/http/index.js';
import { getStorage } from '../src/storage/index.js';
import { parseMessageListQuery } from '../src/chat/messageListPayload.js';

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

function makeJsonPost(url, payload) {
  const json = JSON.stringify(payload);
  const stream = Readable.from([Buffer.from(json)]);
  stream.url = url;
  stream.method = 'POST';
  stream.headers = { 'content-type': 'application/json' };
  return stream;
}

test('parseMessageListQuery defaults', () => {
  const q = new URLSearchParams('');
  assert.deepEqual(parseMessageListQuery(q), { limit: 50, beforeTs: null });
});

test('parseMessageListQuery reads limit and beforeTs', () => {
  const q = new URLSearchParams('limit=10&beforeTs=99');
  assert.deepEqual(parseMessageListQuery(q), { limit: 10, beforeTs: 99 });
});

test('GET /api/chats rows use chatId and type', async () => {
  const handler = createHttpHandler();
  const req = { url: '/api/chats', method: 'GET' };
  const res = makeRes();
  await handler(req, res);
  const body = JSON.parse(res.body);
  const row = body.data.chats[0];
  assert.equal(row.chatId, 'direct:u1:u2');
  assert.equal(row.type, 'direct');
  assert.equal(row.unreadCount, 0);
});

test('GET messages JSON uses content not body', async () => {
  const storage = getStorage();
  const bodyText = `hello-${Date.now()}`;
  await storage.messages.append({ chatId: 'direct:u1:u2', body: bodyText, senderId: 'u1' });
  const handler = createHttpHandler();
  const req = { url: '/api/chats/direct%3Au1%3Au2/messages', method: 'GET' };
  const res = makeRes();
  await handler(req, res);
  assert.equal(res.statusCode, 200);
  const body = JSON.parse(res.body);
  const found = body.data.messages.find((m) => m.content === bodyText);
  assert.ok(found);
  assert.equal(found.body, undefined);
  assert.equal(found.id, found.messageId);
  assert.ok(typeof found.id === 'string' && found.id.length > 0);
});

test('GET /api/chats/search returns chat discovery rows', async () => {
  const storage = getStorage();
  await storage.messages.append({
    chatId: 'direct:u1:u2',
    body: `find-me-${Date.now()}`,
    senderId: 'u2',
  });
  const handler = createHttpHandler();
  const req = { url: '/api/chats/search?q=find-me', method: 'GET' };
  const res = makeRes();
  await handler(req, res);
  assert.equal(res.statusCode, 200);
  const body = JSON.parse(res.body);
  assert.equal(body.success, true);
  assert.equal(body.data.query, 'find-me');
  assert.ok(Array.isArray(body.data.results));
  const first = body.data.results[0];
  assert.ok(first.type === 'chat' || first.type === 'message');
  assert.equal(typeof first.chatId, 'string');
});

test('POST /api/uploads/image returns upload metadata and serves bytes', async () => {
  const handler = createHttpHandler();
  const png = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO6sJZcAAAAASUVORK5CYII=',
    'base64',
  );
  const req = makeJsonPost('/api/uploads/image', {
    filename: 'dot.png',
    mimeType: 'image/png',
    size: png.length,
    dataUrl: `data:image/png;base64,${png.toString('base64')}`,
  });
  const res = makeRes();
  await handler(req, res);

  assert.equal(res.statusCode, 200);
  const body = JSON.parse(res.body);
  assert.equal(body.success, true);
  assert.equal(typeof body.data?.upload?.url, 'string');

  const imageRes = makeRes();
  await handler({ url: body.data.upload.url, method: 'GET' }, imageRes);
  assert.equal(imageRes.statusCode, 200);
  assert.equal(imageRes.headers['Content-Type'], 'image/png');
  assert.ok(Buffer.isBuffer(imageRes.body));
  assert.equal(imageRes.body.length, png.length);
});

test('POST /api/uploads/image rejects unsupported type', async () => {
  const handler = createHttpHandler();
  const req = makeJsonPost('/api/uploads/image', {
    filename: 'vector.svg',
    mimeType: 'image/svg+xml',
    dataUrl: 'data:image/svg+xml;base64,PHN2Zz48L3N2Zz4=',
  });
  const res = makeRes();
  await handler(req, res);
  assert.equal(res.statusCode, 400);
  const body = JSON.parse(res.body);
  assert.equal(body.code, 'UNSUPPORTED_FILE_TYPE');
});
