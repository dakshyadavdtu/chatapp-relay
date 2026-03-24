import { test } from 'node:test';
import assert from 'node:assert/strict';
import { jsonErr, jsonOk } from '../src/http/json.js';

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

test('jsonOk wraps data', () => {
  const res = makeRes();
  jsonOk(res, { ok: true });
  assert.equal(res.statusCode, 200);
  assert.deepEqual(JSON.parse(res.body), { success: true, data: { ok: true } });
});

test('jsonErr wraps error', () => {
  const res = makeRes();
  jsonErr(res, 400, 'bad', 'BAD');
  assert.equal(res.statusCode, 400);
  const body = JSON.parse(res.body);
  assert.equal(body.success, false);
  assert.equal(body.error, 'bad');
  assert.equal(body.code, 'BAD');
});
