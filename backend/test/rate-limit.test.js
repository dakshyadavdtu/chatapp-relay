import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Readable } from 'node:stream';
import { createHttpHandler } from '../src/http/index.js';
import { resetLimitersForTest } from '../src/http/rateLimit.js';

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

function makeLoginReq(ip, payload) {
  const json = JSON.stringify(payload);
  const stream = Readable.from([Buffer.from(json)]);
  stream.url = '/api/login';
  stream.method = 'POST';
  stream.headers = { 'content-type': 'application/json', 'x-forwarded-for': ip };
  return stream;
}

test('login rate limit returns 429 after threshold', async () => {
  resetLimitersForTest();
  const handler = createHttpHandler();
  const ip = '10.0.0.9';

  let lastStatus = null;
  for (let i = 0; i < 31; i++) {
    const res = makeRes();
    await handler(makeLoginReq(ip, { username: 'none', password: 'none' }), res);
    lastStatus = res.statusCode;
  }
  assert.equal(lastStatus, 429);

  const otherRes = makeRes();
  await handler(makeLoginReq('10.0.0.10', { username: 'none', password: 'none' }), otherRes);
  assert.notEqual(otherRes.statusCode, 429);

  resetLimitersForTest();
});
