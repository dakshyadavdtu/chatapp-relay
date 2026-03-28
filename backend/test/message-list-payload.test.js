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
