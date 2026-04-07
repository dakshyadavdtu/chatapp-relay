import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  chatState,
  resetChatApi,
  resetChatState,
  sendActiveMessage,
  setActiveChatId,
  setChatApi,
} from './state.js';

function stubApi(message) {
  return {
    async sendMessageToChat(_chatId, _content, clientId) {
      return {
        success: true,
        data: { message: { ...message, clientId } },
      };
    },
  };
}

test('sendActiveMessage requires an active chat', async () => {
  resetChatState();
  const res = await sendActiveMessage('hello');
  assert.equal(res.ok, false);
  assert.equal(res.code, 'NO_ACTIVE_CHAT');
  assert.equal(chatState.sendStatus, 'error');
});

test('sendActiveMessage requires recipient', async () => {
  resetChatState();
  setActiveChatId('chat-1');
  chatState.activeChat = { chatId: 'chat-1', participants: [] };

  const res = await sendActiveMessage('hello');

  assert.equal(res.ok, false);
  assert.equal(res.code, 'NO_RECIPIENT');
  assert.equal(chatState.sendStatus, 'error');
});

test('sendActiveMessage merges returned message', async () => {
  resetChatState();
  setActiveChatId('chat-1');
  chatState.activeChat = { chatId: 'chat-1', participants: ['u2'] };
  setChatApi(stubApi({ id: 'm1', chatId: 'chat-1', content: 'hi', createdAt: 1 }));

  const res = await sendActiveMessage('hi');

  assert.equal(res.ok, true);
  const items = chatState.messagesByChat['chat-1']?.items ?? [];
  const confirmed = items.find((m) => m.id === 'm1');
  assert.ok(confirmed);
  assert.equal(confirmed.content, 'hi');
  assert.equal(chatState.sendStatus, 'ok');
});

test.after(() => {
  resetChatApi();
  resetChatState();
});
