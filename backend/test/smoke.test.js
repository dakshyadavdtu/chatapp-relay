import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getHealth } from '../src/services/health.js';
import { createHttpHandler } from '../src/http/index.js';

test('health service', () => {
  assert.deepEqual(getHealth(), { ok: true });
});

function makeRes() {
  return {
    statusCode: null,
    headers: null,
    body: null,
    writeHead(statusCode, headers) {
      this.statusCode = statusCode;
      this.headers = headers;
    },
    end(body) {
      this.body = body;
    },
  };
}

test('http route /', async () => {
  const handler = createHttpHandler();
  const req = { url: '/' };
  const res = makeRes();

  await handler(req, res);

  assert.equal(res.statusCode, 200);
  assert.deepEqual(res.headers, { 'Content-Type': 'text/plain; charset=utf-8' });
  assert.equal(res.body, 'ok\n');
});

test('http route /health', async () => {
  const handler = createHttpHandler();
  const req = { url: '/health' };
  const res = makeRes();

  await handler(req, res);

  assert.equal(res.statusCode, 200);
  assert.deepEqual(res.headers, { 'Content-Type': 'text/plain; charset=utf-8' });
  assert.equal(res.body, 'ok\n');
});

test('http route /health with query', async () => {
  const handler = createHttpHandler();
  const req = { url: '/health?x=1' };
  const res = makeRes();

  await handler(req, res);

  assert.equal(res.statusCode, 200);
  assert.deepEqual(res.headers, { 'Content-Type': 'text/plain; charset=utf-8' });
  assert.equal(res.body, 'ok\n');
});

test('http route /api/health', async () => {
  const handler = createHttpHandler();
  const req = { url: '/api/health', method: 'GET' };
  const res = makeRes();

  await handler(req, res);

  assert.equal(res.statusCode, 200);
  assert.equal(res.headers['Content-Type'], 'application/json; charset=utf-8');
  assert.deepEqual(JSON.parse(res.body), { success: true, data: { ok: true } });
});

test('http route /api/me unauthenticated', async () => {
  const handler = createHttpHandler();
  const req = { url: '/api/me', method: 'GET' };
  const res = makeRes();

  await handler(req, res);

  assert.equal(res.statusCode, 401);
  assert.equal(res.headers['Content-Type'], 'application/json; charset=utf-8');
  const body = JSON.parse(res.body);
  assert.equal(body.success, false);
  assert.equal(body.code, 'UNAUTHORIZED');
});

test('http route 404', async () => {
  const handler = createHttpHandler();
  const req = { url: '/nope' };
  const res = makeRes();

  await handler(req, res);

  assert.equal(res.statusCode, 404);
  assert.deepEqual(res.headers, { 'Content-Type': 'text/plain; charset=utf-8' });
  assert.equal(res.body, 'not found\n');
});
