import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeMessageListForChat } from './messageList.js';

test('normalizeMessageListForChat merges and keeps clientId when missing in incoming', () => {
  const existing = [
    {
      id: 'msg_1',
      clientId: 'tmp_abc',
      chatId: 'c1',
      content: 'hi',
      createdAt: 50,
      state: 'PENDING',
    },
  ];

  const incoming = [
    {
      id: 'msg_1',
      chatId: 'c1',
      content: 'hi',
      createdAt: 75,
      state: 'SENT',
    },
  ];

  const out = normalizeMessageListForChat(incoming, 'c1', existing);
  assert.equal(out.length, 1);
  const m = out[0];
  assert.equal(m.id, 'msg_1');
  assert.equal(m.clientId, 'tmp_abc');
  assert.equal(m.state, 'SENT');
  assert.equal(m.createdAt, 75);
});

test('normalizeMessageListForChat keeps newer local state over stale replay row', () => {
  const existing = [
    {
      id: 'msg_2',
      messageId: 'msg_2',
      clientId: 'tmp_2',
      chatId: 'c1',
      content: 'hello',
      createdAt: 200,
      state: 'SENT',
    },
  ];

  const incoming = [
    {
      id: 'msg_2',
      messageId: 'msg_2',
      chatId: 'c1',
      content: '',
      createdAt: 180,
      state: 'PENDING',
    },
  ];

  const out = normalizeMessageListForChat(incoming, 'c1', existing);
  assert.equal(out.length, 1);
  const m = out[0];
  assert.equal(m.state, 'SENT');
  assert.equal(m.createdAt, 200);
  assert.equal(m.content, 'hello');
});
