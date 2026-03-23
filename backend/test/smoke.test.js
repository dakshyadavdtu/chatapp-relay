import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getHealth } from '../src/services/health.js';
import { createHttpHandler } from '../src/routes/http.js';

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

test('http route /', () => {
  const handler = createHttpHandler();
  const req = { url: '/' };
  const res = makeRes();

  handler(req, res);

  assert.equal(res.statusCode, 200);
  assert.equal(res.body, 'ok\n');
});

test('http route /health', () => {
  const handler = createHttpHandler();
  const req = { url: '/health' };
  const res = makeRes();

  handler(req, res);

  assert.equal(res.statusCode, 200);
  assert.equal(res.body, 'ok\n');
});

test('http route 404', () => {
  const handler = createHttpHandler();
  const req = { url: '/nope' };
  const res = makeRes();

  handler(req, res);

  assert.equal(res.statusCode, 404);
  assert.equal(res.body, 'not found\n');
});
