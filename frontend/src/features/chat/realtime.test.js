import { test } from 'node:test';
import assert from 'node:assert/strict';
import { toIncomingChatMessage } from './realtime.js';

test('toIncomingChatMessage reads nested message payload', () => {
  const out = toIncomingChatMessage({
    type: 'MESSAGE_RECEIVE',
    message: {
      id: 'm1',
      chatId: 'c1',
      content: 'hello',
      createdAt: 10,
    },
  });
  assert.equal(out?.id, 'm1');
  assert.equal(out?.chatId, 'c1');
  assert.equal(out?.content, 'hello');
});

test('toIncomingChatMessage reads flat payload shape', () => {
  const out = toIncomingChatMessage({
    type: 'MESSAGE_RECEIVE',
    messageId: 'm2',
    clientId: 'tmp_1',
    chatId: 'c2',
    senderId: 'u1',
    recipientId: 'u2',
    content: 'hi',
    timestamp: 20,
    state: 'SENT',
  });
  assert.equal(out?.messageId, 'm2');
  assert.equal(out?.createdAt, 20);
  assert.equal(out?.clientId, 'tmp_1');
});

test('toIncomingChatMessage returns null for invalid payload', () => {
  assert.equal(toIncomingChatMessage(null), null);
  assert.equal(toIncomingChatMessage({ type: 'MESSAGE_RECEIVE' }), null);
});
