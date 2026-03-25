import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createStorage } from '../src/storage/index.js';

test('storage facade exposes chats messages rooms', () => {
  const s = createStorage();
  assert.equal(s.ready, true);
  assert.equal(typeof s.chats.get, 'function');
  assert.equal(typeof s.chats.listForUser, 'function');
  assert.equal(typeof s.messages.append, 'function');
  assert.equal(typeof s.messages.getById, 'function');
  assert.equal(typeof s.messages.listByChatId, 'function');
  assert.equal(typeof s.rooms.get, 'function');
});

test('storage methods validate inputs', async () => {
  const s = createStorage();
  await assert.rejects(() => s.messages.append({}), /chatId required/i);
  const msgs = await s.messages.listByChatId('c1');
  assert.equal(Array.isArray(msgs), true);
});
