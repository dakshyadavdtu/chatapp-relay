import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  createChatService,
  createMessageId,
  isDirectChatId,
  isRoomChatId,
  isValidMessageDraft,
  toDirectChatId,
  toRoomChatId,
} from '../src/chat/index.js';
import { createStorage } from '../src/storage/index.js';

test('toDirectChatId is stable sorted', () => {
  assert.equal(toDirectChatId('b', 'a'), 'direct:a:b');
  assert.equal(toDirectChatId('a', 'b'), 'direct:a:b');
});

test('toRoomChatId prefix', () => {
  assert.equal(toRoomChatId('room_1'), 'room:room_1');
});

test('chat id helpers', () => {
  assert.equal(isDirectChatId('direct:a:b'), true);
  assert.equal(isRoomChatId('room:x'), true);
});

test('messageId shape', () => {
  const id = createMessageId();
  assert.ok(id.startsWith('msg_'));
});

test('message draft validation', () => {
  assert.equal(
    isValidMessageDraft({
      senderId: 'a',
      recipientId: 'b',
      content: 'hi',
    }),
    true,
  );
  assert.equal(
    isValidMessageDraft({
      senderId: 'a',
      recipientId: 'a',
      content: 'hi',
    }),
    false,
  );
});

test('chat service delegates to storage', async () => {
  const storage = createStorage();
  const chat = createChatService(storage);
  const chats = await chat.listChatsForUser('u1');
  assert.equal(Array.isArray(chats), true);
  const c1 = await chat.getChat('c1');
  assert.equal(c1?.id, 'c1');
  const msgs = await chat.listMessages('c1', {});
  assert.equal(Array.isArray(msgs), true);
  const appended = await chat.appendMessage({ chatId: 'c1', body: 'hi', senderId: 'u1' });
  assert.equal(appended.chatId, 'c1');
  const byId = await chat.getMessage(appended.id);
  assert.equal(byId?.id, appended.id);
});
