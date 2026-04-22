import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  applyIncomingMessage,
  applyMessageStateUpdate,
  applyPresenceEvent,
  applyPresenceSnapshot,
  applyTypingEvent,
  chatState,
  resetChatState,
} from './state.js';

test('typing start/stop is tracked per chat/user', () => {
  resetChatState();
  applyTypingEvent({ type: 'TYPING_START', chatId: 'c1', userId: 'u9' });
  assert.ok(chatState.typingByChat.c1);
  assert.ok(chatState.typingByChat.c1.u9);

  applyTypingEvent({ type: 'TYPING_STOP', chatId: 'c1', userId: 'u9' });
  assert.equal(chatState.typingByChat.c1.u9, undefined);
});

test('presence event updates status for a user', () => {
  resetChatState();
  applyPresenceEvent({ userId: 'u5', status: 'online', ts: 111 });
  assert.equal(chatState.presenceByUser.u5.status, 'online');
  applyPresenceEvent({ userId: 'u5', status: 'offline', ts: 222 });
  assert.equal(chatState.presenceByUser.u5.status, 'offline');
});

test('presence snapshot fills many users', () => {
  resetChatState();
  applyPresenceSnapshot({ users: [
    { userId: 'a', status: 'online' },
    { userId: 'b', status: 'offline' },
  ] });
  assert.equal(chatState.presenceByUser.a.status, 'online');
  assert.equal(chatState.presenceByUser.b.status, 'offline');
});

test('state update flips a known message to READ', () => {
  resetChatState();
  applyIncomingMessage({
    id: 'm1',
    messageId: 'm1',
    chatId: 'c2',
    senderId: 'me',
    recipientId: 'them',
    content: 'hi',
    createdAt: 100,
    state: 'SENT',
  });
  applyMessageStateUpdate({ chatId: 'c2', messageId: 'm1', state: 'READ' });
  const items = chatState.messagesByChat.c2.items;
  assert.equal(items[0].state, 'READ');
});

test('state update on unknown message is a no-op', () => {
  resetChatState();
  applyMessageStateUpdate({ chatId: 'missing', messageId: 'x', state: 'READ' });
  assert.equal(chatState.messagesByChat.missing, undefined);
});
