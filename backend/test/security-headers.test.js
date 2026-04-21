import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHttpHandler } from '../src/http/index.js';

function makeRes() {
  return {
    statusCode: null,
    headers: {},
    body: null,
    setHeader(name, value) {
      this.headers[name] = value;
    },
    writeHead(statusCode, headers) {
      this.statusCode = statusCode;
      this.headers = { ...(this.headers || {}), ...headers };
    },
    end(body) {
      this.body = body;
    },
  };
}

test('applies common security headers on responses', async () => {
  const handler = createHttpHandler();
  const req = { url: '/api/health', method: 'GET', headers: {} };
  const res = makeRes();
  await handler(req, res);

  assert.equal(res.headers['X-Content-Type-Options'], 'nosniff');
  assert.equal(res.headers['X-Frame-Options'], 'DENY');
  assert.equal(res.headers['Referrer-Policy'], 'no-referrer');
});
