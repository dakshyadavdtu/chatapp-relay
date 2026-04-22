import { createServer } from 'node:http';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHttpHandler } from '../src/http/index.js';
import { ensureRootAdmin, resetUsersForTest } from '../src/auth/users.js';

function startServer() {
  return new Promise((resolve) => {
    const server = createServer(createHttpHandler());
    server.listen(0, () => resolve(server));
  });
}

async function loginAs(port, username, password) {
  const res = await fetch(`http://127.0.0.1:${port}/api/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });
  return { status: res.status, cookie: res.headers.get('set-cookie') };
}

async function register(port, username) {
  const res = await fetch(`http://127.0.0.1:${port}/api/register`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ username, password: 'pw1234' }),
  });
  return { status: res.status, cookie: res.headers.get('set-cookie') };
}

test('admin route requires admin role', async () => {
  resetUsersForTest();
  ensureRootAdmin({ username: 'rootadmin', password: 'rootrootroot' });
  const server = await startServer();
  const { port } = server.address();

  const noAuth = await fetch(`http://127.0.0.1:${port}/api/admin/users`);
  assert.equal(noAuth.status, 401);

  const user = await register(port, 'regular');
  assert.equal(user.status, 201);
  const denied = await fetch(`http://127.0.0.1:${port}/api/admin/users`, {
    headers: { cookie: user.cookie },
  });
  assert.equal(denied.status, 403);

  const admin = await loginAs(port, 'rootadmin', 'rootrootroot');
  assert.equal(admin.status, 200);
  const ok = await fetch(`http://127.0.0.1:${port}/api/admin/users`, {
    headers: { cookie: admin.cookie },
  });
  assert.equal(ok.status, 200);
  const body = await ok.json();
  assert.ok(Array.isArray(body?.data?.users));
  const names = body.data.users.map((u) => u.username);
  assert.ok(names.includes('rootadmin'));
  assert.ok(names.includes('regular'));

  await new Promise((r) => server.close(() => r()));
});

test('admin can soft-delete a message', async () => {
  resetUsersForTest();
  ensureRootAdmin({ username: 'rootadmin', password: 'rootrootroot' });
  const server = await startServer();
  const { port } = server.address();

  const alice = await register(port, 'alice');
  await register(port, 'bob');

  const sendRes = await fetch(`http://127.0.0.1:${port}/api/chat/send`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', cookie: alice.cookie },
    body: JSON.stringify({ recipientId: 'bob', content: 'spam' }),
  });
  assert.equal(sendRes.status, 201);
  const sent = await sendRes.json();
  const messageId = sent?.data?.message?.id;
  assert.ok(messageId);

  const admin = await loginAs(port, 'rootadmin', 'rootrootroot');
  const del = await fetch(`http://127.0.0.1:${port}/api/admin/messages/${messageId}`, {
    method: 'POST',
    headers: { cookie: admin.cookie },
  });
  assert.equal(del.status, 200);
  const delBody = await del.json();
  assert.equal(delBody?.data?.message?.id, messageId);
  assert.ok(delBody?.data?.message?.deletedAt);

  const list = await fetch(`http://127.0.0.1:${port}/api/chats/direct:alice:bob/messages`, {
    headers: { cookie: alice.cookie },
  });
  const listBody = await list.json();
  const row = listBody.data.messages.find((m) => m.id === messageId);
  assert.ok(row);
  assert.equal(row.content, '');
  assert.ok(row.deletedAt);

  await new Promise((r) => server.close(() => r()));
});
