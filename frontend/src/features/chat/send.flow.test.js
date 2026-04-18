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

test('sendActiveMessage supports image-only payload', async () => {
  resetChatState();
  setActiveChatId('chat-1');
  chatState.activeChat = { chatId: 'chat-1', participants: ['u2'] };
  setChatApi({
    async sendMessageToChat(_chatId, _content, clientId, options) {
      assert.equal(options?.image?.url, '/uploads/img_1');
      return {
        success: true,
        data: {
          message: {
            id: 'm_img_1',
            chatId: 'chat-1',
            content: '[image]',
            messageType: 'image',
            imageUrl: '/uploads/img_1',
            createdAt: 2,
            clientId,
          },
        },
      };
    },
  });

  const res = await sendActiveMessage('', {
    image: {
      url: '/uploads/img_1',
      name: 'photo.png',
      mimeType: 'image/png',
      size: 1024,
    },
  });

  assert.equal(res.ok, true);
  const items = chatState.messagesByChat['chat-1']?.items ?? [];
  const confirmed = items.find((m) => m.id === 'm_img_1');
  assert.ok(confirmed);
  assert.equal(confirmed.messageType, 'image');
  assert.equal(confirmed.imageUrl, '/uploads/img_1');
});

test.after(() => {
  resetChatApi();
  resetChatState();
});
