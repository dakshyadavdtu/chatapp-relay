import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildMessageCreatedPayload } from '../src/websocket/outbound.js';

test('buildMessageCreatedPayload matches wire shape', () => {
  const p = buildMessageCreatedPayload({
    messageId: 'msg_x',
    chatId: 'direct:a:b',
    senderId: 'a',
    recipientId: 'b',
    content: 'hello',
    createdAt: 42,
  });
  assert.equal(p.type, 'MESSAGE_RECEIVE');
  assert.equal(p.messageId, 'msg_x');
  assert.equal(p.message.id, 'msg_x');
  assert.equal(p.message.messageId, 'msg_x');
  assert.equal(p.message.chatId, 'direct:a:b');
  assert.equal(p.message.senderId, 'a');
  assert.equal(p.message.recipientId, 'b');
  assert.equal(p.message.content, 'hello');
  assert.equal(p.createdAt, 42);
  assert.equal(p.message.createdAt, 42);
  assert.equal(p.message.state, 'SENT');
});
