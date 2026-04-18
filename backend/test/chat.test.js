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
import { onMessageCreated } from '../src/realtime/bus.js';
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
  const c1 = await chat.getChat('direct:u1:u2');
  assert.equal(c1?.id, 'direct:u1:u2');
  const msgs = await chat.listMessages('direct:u1:u2', {});
  assert.equal(Array.isArray(msgs), true);
  const appended = await chat.appendMessage({ chatId: 'direct:u1:u2', body: 'hi', senderId: 'u1' });
  assert.equal(appended.chatId, 'direct:u1:u2');
  const byId = await chat.getMessage(appended.id);
  assert.equal(byId?.id, appended.id);
});

test('chatListBody has chats array', async () => {
  const storage = createStorage();
  const chat = createChatService(storage);
  const body = await chat.chatListBody('u1');
  assert.ok(Array.isArray(body.chats));
  assert.equal(body.chats.some((c) => c.chatId === 'direct:u1:u2'), true);
});

test('messageListBody returns messages and meta', async () => {
  const storage = createStorage();
  const chat = createChatService(storage);
  const q = new URLSearchParams('');
  const out = await chat.messageListBody('u1', 'direct:u1:u2', q);
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
  assert.equal(out.data.message.id, out.data.message.messageId);
  assert.equal(out.data.message.chatId, 'direct:u1:u2');
  assert.equal(out.data.message.content, 'hello');
});

test('sendMessageBody triggers message created hook', async () => {
  const storage = createStorage();
  const chat = createChatService(storage);
  let seen = null;
  onMessageCreated((evt) => {
    seen = evt;
  });

  await chat.sendMessageBody('u1', { recipientId: 'u2', content: 'hello hook' });

  assert.equal(seen?.chatId, 'direct:u1:u2');
  onMessageCreated(() => {});
});

test('sendMessageBody rejects long content', async () => {
  const storage = createStorage();
  const chat = createChatService(storage);
  const out = await chat.sendMessageBody('u1', {
    recipientId: 'u2',
    content: 'x'.repeat(2001),
  });
  assert.equal(out.ok, false);
  assert.equal(out.code, 'CONTENT_TOO_LONG');
});

test('chatBody returns a single chat row', async () => {
  const storage = createStorage();
  const chat = createChatService(storage);
  const out = await chat.chatBody('u1', 'direct:u1:u2');
  assert.equal(out.ok, true);
  assert.equal(out.data.chat.chatId, 'direct:u1:u2');
});

test('chatBody denies user outside chat members', async () => {
  const storage = createStorage();
  const chat = createChatService(storage);
  const out = await chat.chatBody('u3', 'direct:u1:u2');
  assert.equal(out.ok, false);
  assert.equal(out.code, 'CHAT_ACCESS_DENIED');
});

test('messageListBody denies user outside chat members', async () => {
  const storage = createStorage();
  const chat = createChatService(storage);
  const out = await chat.messageListBody('u3', 'direct:u1:u2', new URLSearchParams(''));
  assert.equal(out.ok, false);
  assert.equal(out.code, 'CHAT_ACCESS_DENIED');
});

test('sendMessageBody echoes clientId', async () => {
  const storage = createStorage();
  const chat = createChatService(storage);
  const out = await chat.sendMessageBody('u1', {
    recipientId: 'u2',
    content: 'hello',
    clientId: 'temp_123',
  });
  assert.equal(out.ok, true);
  assert.equal(out.data.message.clientId, 'temp_123');
});

test('sendMessageToChat uses chat recipient and returns message', async () => {
  const storage = createStorage();
  const chat = createChatService(storage);
  const out = await chat.sendMessageToChat('u1', 'direct:u1:u2', {
    content: 'hi via chat',
    clientId: 'tmp_456',
  });
  assert.equal(out.ok, true);
  assert.equal(out.data.message.chatId, 'direct:u1:u2');
  assert.equal(out.data.message.recipientId, 'u2');
  assert.equal(out.data.message.clientId, 'tmp_456');
});

test('sendMessageToChat supports image payload', async () => {
  const storage = createStorage();
  const chat = createChatService(storage);
  const out = await chat.sendMessageToChat('u1', 'direct:u1:u2', {
    content: '',
    imageUrl: '/uploads/img_1',
    imageName: 'photo.png',
    imageMimeType: 'image/png',
    imageSize: 500,
    clientId: 'tmp_img_1',
  });
  assert.equal(out.ok, true);
  assert.equal(out.data.message.messageType, 'image');
  assert.equal(out.data.message.imageUrl, '/uploads/img_1');
  assert.equal(out.data.message.image?.url, '/uploads/img_1');

  const list = await chat.chatListBody('u1');
  const row = list.chats.find((chatRow) => chatRow.chatId === 'direct:u1:u2');
  assert.equal(row?.lastMessage?.messageType, 'image');
  assert.equal(row?.lastMessage?.content, '[image]');
});

test('openChatBody returns chat and messages', async () => {
  const storage = createStorage();
  const chat = createChatService(storage);
  await chat.sendMessageToChat('u1', 'direct:u1:u2', { content: 'first', clientId: 'tmp_1' });

  const res = await chat.openChatBody('u1', 'direct:u1:u2', new URLSearchParams(''));
  assert.equal(res.ok, true);
  assert.equal(res.data.chat.chatId, 'direct:u1:u2');
  assert.equal(Array.isArray(res.data.messages), true);
  assert.equal(res.data.messages.length >= 1, true);
  assert.equal(res.data.messages[res.data.messages.length - 1].recipientId, 'u2');
});

test('chatListBody unread clears after markReadBody', async () => {
  const storage = createStorage();
  const chat = createChatService(storage);
  const sent = await chat.sendMessageToChat('u2', 'direct:u1:u2', {
    content: 'new for u1',
    clientId: 'tmp_unread_1',
  });
  assert.equal(sent.ok, true);

  const before = await chat.chatListBody('u1');
  const rowBefore = before.chats.find((row) => row.chatId === 'direct:u1:u2');
  assert.equal(rowBefore?.unreadCount, 1);

  const readRes = await chat.markReadBody('u1', 'direct:u1:u2', {
    lastReadMessageId: sent.data.message.id,
  });
  assert.equal(readRes.ok, true);
  assert.equal(readRes.data.unreadCount, 0);

  const after = await chat.chatListBody('u1');
  const rowAfter = after.chats.find((row) => row.chatId === 'direct:u1:u2');
  assert.equal(rowAfter?.unreadCount, 0);
});

test('markReadBody rejects unknown message id', async () => {
  const storage = createStorage();
  const chat = createChatService(storage);
  const out = await chat.markReadBody('u1', 'direct:u1:u2', {
    lastReadMessageId: 'missing-message-id',
  });
  assert.equal(out.ok, false);
  assert.equal(out.status, 404);
  assert.equal(out.code, 'READ_MESSAGE_NOT_FOUND');
});

test('messageListBody returns clientId and state from sent message', async () => {
  const storage = createStorage();
  const chat = createChatService(storage);
  await chat.sendMessageBody('u1', {
    recipientId: 'u2',
    content: 'hello history',
    clientId: 'temp_history',
  });

  const res = await chat.messageListBody('u1', 'direct:u1:u2', new URLSearchParams(''));
  assert.equal(res.ok, true);
  assert.equal(Array.isArray(res.data.messages), true);
  const last = res.data.messages[res.data.messages.length - 1];
  assert.equal(last.clientId, 'temp_history');
  assert.equal(last.state, 'SENT');
});

test('searchChatsBody returns chat and message results', async () => {
  const storage = createStorage();
  const chat = createChatService(storage);
  await chat.sendMessageToChat('u2', 'direct:u1:u2', {
    content: 'searchable hello day18',
    clientId: 'tmp_search_1',
  });

  const out = await chat.searchChatsBody('u1', 'hello');
  assert.equal(out.ok, true);
  assert.equal(out.data.query, 'hello');
  assert.ok(Array.isArray(out.data.results));
  const chatRow = out.data.results.find((row) => row.type === 'chat');
  const messageRow = out.data.results.find((row) => row.type === 'message');
  assert.equal(chatRow?.chatId, 'direct:u1:u2');
  assert.equal(messageRow?.chatId, 'direct:u1:u2');
  assert.equal(typeof messageRow?.messageId, 'string');
});

test('searchChatsBody with empty query returns no results', async () => {
  const storage = createStorage();
  const chat = createChatService(storage);
  const out = await chat.searchChatsBody('u1', '   ');
  assert.equal(out.ok, true);
  assert.equal(out.data.query, '');
  assert.deepEqual(out.data.results, []);
});
