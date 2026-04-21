import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Readable } from 'node:stream';
import { createHttpHandler } from '../src/http/index.js';
import { resetCorsCacheForTest } from '../src/http/cors.js';

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

function makeGet(url, headers) {
  const stream = Readable.from([]);
  stream.url = url;
  stream.method = 'GET';
  stream.headers = headers ?? {};
  return stream;
}

function makeOptions(url, headers) {
  const stream = Readable.from([]);
  stream.url = url;
  stream.method = 'OPTIONS';
  stream.headers = headers ?? {};
  return stream;
}

test('CORS allows configured origin', async () => {
  process.env.ALLOWED_ORIGINS = 'https://app.example.com';
  resetCorsCacheForTest();
  const handler = createHttpHandler();
  const req = makeGet('/api/health', { origin: 'https://app.example.com' });
  const res = makeRes();
  await handler(req, res);
  assert.equal(res.statusCode, 200);
  assert.equal(res.headers['Access-Control-Allow-Origin'], 'https://app.example.com');
  assert.equal(res.headers['Access-Control-Allow-Credentials'], 'true');
  delete process.env.ALLOWED_ORIGINS;
  resetCorsCacheForTest();
});

test('CORS skips origins not in the allow list', async () => {
  process.env.ALLOWED_ORIGINS = 'https://app.example.com';
  resetCorsCacheForTest();
  const handler = createHttpHandler();
  const req = makeGet('/api/health', { origin: 'https://other.example.com' });
  const res = makeRes();
  await handler(req, res);
  assert.equal(res.statusCode, 200);
  assert.equal(res.headers['Access-Control-Allow-Origin'], undefined);
  delete process.env.ALLOWED_ORIGINS;
  resetCorsCacheForTest();
});

test('CORS preflight returns 204 with headers', async () => {
  process.env.ALLOWED_ORIGINS = 'https://app.example.com';
  resetCorsCacheForTest();
  const handler = createHttpHandler();
  const req = makeOptions('/api/login', {
    origin: 'https://app.example.com',
    'access-control-request-headers': 'Content-Type',
  });
  const res = makeRes();
  await handler(req, res);
  assert.equal(res.statusCode, 204);
  assert.equal(res.headers['Access-Control-Allow-Origin'], 'https://app.example.com');
  assert.equal(res.headers['Access-Control-Allow-Headers'], 'Content-Type');
  delete process.env.ALLOWED_ORIGINS;
  resetCorsCacheForTest();
});

test('CORS does nothing when no origin header', async () => {
  const handler = createHttpHandler();
  const req = makeGet('/api/health', {});
  const res = makeRes();
  await handler(req, res);
  assert.equal(res.statusCode, 200);
  assert.equal(res.headers['Access-Control-Allow-Origin'], undefined);
});
