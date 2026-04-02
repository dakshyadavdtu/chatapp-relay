import { test } from 'node:test';
import assert from 'node:assert/strict';
import { messageListPayload } from '../src/chat/messageListPayload.js';

test('messageListPayload maps id and messageId', () => {
  const out = messageListPayload(
    [
      {
        id: 'msg_a',
        chatId: 'direct:x:y',
        senderId: 'x',
        body: 'hello',
        createdAt: 100,
      },
    ],
    { limit: 50, beforeTs: null },
  );
  assert.equal(out.messages.length, 1);
  const m = out.messages[0];
  assert.equal(m.id, 'msg_a');
  assert.equal(m.messageId, 'msg_a');
  assert.equal(m.content, 'hello');
  assert.equal(m.chatId, 'direct:x:y');
});

test('messageListPayload preserves state, clientId, and timestamp fallback', () => {
  const out = messageListPayload(
    [
      {
        id: 'msg_b',
        chatId: 'direct:x:y',
        senderId: 'x',
        recipientId: 'y',
        body: 'hey',
        timestamp: 200,
        clientId: 'tmp_1',
        state: 'DELIVERED',
      },
    ],
    { limit: 10, beforeTs: null },
  );
  const m = out.messages[0];
  assert.equal(m.createdAt, 200);
  assert.equal(m.clientId, 'tmp_1');
  assert.equal(m.state, 'DELIVERED');
  assert.equal(m.recipientId, 'y');
  assert.equal(out.meta.count, 1);
});
