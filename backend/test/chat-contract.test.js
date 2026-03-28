import { test } from 'node:test';
import assert from 'node:assert/strict';
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
