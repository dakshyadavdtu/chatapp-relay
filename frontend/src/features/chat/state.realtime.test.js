import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  applyIncomingMessage,
  chatState,
  resetChatState,
  setActiveChatId,
} from './state.js';

test('applyIncomingMessage clears stale error state for active chat', () => {
  resetChatState();
  setActiveChatId('c1');
  chatState.messagesByChat.c1 = {
    items: [],
    meta: null,
    status: 'error',
    error: 'fetch_failed',
  };

  applyIncomingMessage({
    id: 'm1',
    messageId: 'm1',
    chatId: 'c1',
    content: 'hello',
    createdAt: 1,
    state: 'SENT',
  });

  assert.equal(chatState.messagesByChat.c1.status, 'ok');
  assert.equal(chatState.messagesByChat.c1.error, null);
});

test('applyIncomingMessage resolves send status on matching ack', () => {
  resetChatState();
  setActiveChatId('c1');
  chatState.sendStatus = 'sending';
  chatState.sendError = null;
  chatState.messagesByChat.c1 = {
    items: [
      {
        id: 'tmp_1',
        messageId: 'tmp_1',
        clientId: 'tmp_1',
        chatId: 'c1',
        content: 'hello',
        createdAt: 1,
        state: 'PENDING',
      },
    ],
    meta: null,
    status: 'ok',
    error: null,
  };

  applyIncomingMessage({
    id: 'm1',
    messageId: 'm1',
    clientId: 'tmp_1',
    chatId: 'c1',
    content: 'hello',
    createdAt: 2,
    state: 'SENT',
  });

  assert.equal(chatState.sendStatus, 'ok');
  assert.equal(chatState.sendError, null);
  assert.equal(chatState.messagesByChat.c1.items.length, 1);
});

test('applyIncomingMessage keeps image preview in chat summary', () => {
  resetChatState();
  setActiveChatId('c1');
  chatState.chats = [
    {
      chatId: 'c2',
      type: 'direct',
      title: null,
      participants: ['u2'],
      unreadCount: 0,
      updatedAt: 0,
      lastMessage: null,
    },
  ];

  applyIncomingMessage({
    id: 'm_img_1',
    messageId: 'm_img_1',
    chatId: 'c2',
    senderId: 'u2',
    recipientId: 'u1',
    content: '',
    messageType: 'image',
    imageUrl: '/uploads/img_1',
    createdAt: 3,
    state: 'SENT',
  });

  const summary = chatState.chats.find((chat) => chat.chatId === 'c2');
  assert.equal(summary?.lastMessage?.messageType, 'image');
  assert.equal(summary?.lastMessage?.content, '[image]');
  assert.equal(summary?.lastMessage?.imageUrl, '/uploads/img_1');
});
