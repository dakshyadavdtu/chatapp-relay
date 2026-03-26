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

test('chatListBody has chats array', async () => {
  const storage = createStorage();
  const chat = createChatService(storage);
  const body = await chat.chatListBody('u1');
  assert.ok(Array.isArray(body.chats));
  assert.equal(body.chats.some((c) => c.chatId === 'c1'), true);
});

test('messageListBody returns messages and meta', async () => {
  const storage = createStorage();
  const chat = createChatService(storage);
  const q = new URLSearchParams('');
  const out = await chat.messageListBody('u1', 'c1', q);
  assert.equal(out.ok, true);
  assert.ok(Array.isArray(out.data.messages));
  assert.equal(typeof out.data.meta.limit, 'number');
});

test('sendMessageBody creates direct chat message', async () => {
  const storage = createStorage();
  const chat = createChatService(storage);
  const out = await chat.sendMessageBody('u1', {
    recipientId: 'u2',
    content: 'hello',
  });
  assert.equal(out.ok, true);
  assert.equal(out.status, 201);
  assert.equal(out.data.message.chatId, 'direct:u1:u2');
  assert.equal(out.data.message.content, 'hello');
});

test('chatBody returns a single chat row', async () => {
  const storage = createStorage();
  const chat = createChatService(storage);
  const out = await chat.chatBody('u1', 'c1');
  assert.equal(out.ok, true);
  assert.equal(out.data.chat.chatId, 'c1');
});
