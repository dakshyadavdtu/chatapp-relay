import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  applyIncomingMessage,
  chatState,
  resetChatApi,
  resetChatState,
  setActiveChatId,
  setChatApi,
} from './state.js';

function flush() {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

function baseChat(chatId, unreadCount, updatedAt) {
  return {
    chatId,
    type: 'direct',
    title: null,
    participants: ['u2'],
    unreadCount,
    updatedAt,
    lastMessage: null,
  };
}

test('inactive chat incoming increments unread and moves summary to top', () => {
  resetChatState();
  setActiveChatId('direct:u1:u2');
  chatState.chats = [
    baseChat('direct:u1:u2', 0, 10),
    baseChat('direct:u1:u3', 0, 5),
  ];

  applyIncomingMessage({
    id: 'm_inactive_1',
    messageId: 'm_inactive_1',
    chatId: 'direct:u1:u3',
    senderId: 'u3',
    recipientId: 'u1',
    content: 'hello from inactive',
    createdAt: 20,
    state: 'SENT',
  });

  assert.equal(chatState.chats[0].chatId, 'direct:u1:u3');
  assert.equal(chatState.chats[0].unreadCount, 1);
  assert.equal(chatState.chats[0].lastMessage?.content, 'hello from inactive');
});

test('active chat incoming keeps unread zero and triggers one mark-read call', async () => {
  resetChatState();
  const calls = [];
  setChatApi({
    async markChatRead(chatId, lastReadMessageId) {
      calls.push({ chatId, lastReadMessageId });
      return {
        success: true,
        data: { chatId, lastReadMessageId, unreadCount: 0 },
      };
    },
  });
  setActiveChatId('direct:u1:u2');
  chatState.chats = [baseChat('direct:u1:u2', 3, 10)];

  applyIncomingMessage({
    id: 'm_active_1',
    messageId: 'm_active_1',
    chatId: 'direct:u1:u2',
    senderId: 'u2',
    recipientId: 'u1',
    content: 'seen in active chat',
    createdAt: 30,
    state: 'SENT',
  });
  await flush();

  applyIncomingMessage({
    id: 'm_active_1',
    messageId: 'm_active_1',
    chatId: 'direct:u1:u2',
    senderId: 'u2',
    recipientId: 'u1',
    content: 'seen in active chat',
    createdAt: 30,
    state: 'SENT',
  });
  await flush();

  assert.equal(chatState.chats[0].unreadCount, 0);
  assert.equal(chatState.readStatusByChat['direct:u1:u2'], 'ok');
  assert.equal(calls.length, 1);
  assert.deepEqual(calls[0], {
    chatId: 'direct:u1:u2',
    lastReadMessageId: 'm_active_1',
  });
});

test('active self-sent message does not call mark-read', async () => {
  resetChatState();
  const calls = [];
  setChatApi({
    async markChatRead(chatId, lastReadMessageId) {
      calls.push({ chatId, lastReadMessageId });
      return { success: true, data: { chatId, lastReadMessageId, unreadCount: 0 } };
    },
  });
  setActiveChatId('direct:u1:u2');
  chatState.chats = [baseChat('direct:u1:u2', 0, 10)];

  applyIncomingMessage({
    id: 'm_self_1',
    messageId: 'm_self_1',
    chatId: 'direct:u1:u2',
    senderId: 'u1',
    recipientId: 'u2',
    content: 'my own message',
    createdAt: 40,
    state: 'SENT',
  });
  await flush();

  assert.equal(chatState.chats[0].unreadCount, 0);
  assert.equal(calls.length, 0);
});

test.after(() => {
  resetChatApi();
  resetChatState();
});
