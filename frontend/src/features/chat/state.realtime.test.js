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
