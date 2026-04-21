import { registerWithBody } from '../../../auth/service.js';
import { buildSessionCookie } from '../../../auth/cookies.js';
import { readJsonBody } from '../../body.js';
import { jsonErr, jsonOk } from '../../json.js';
import { createLimiter } from '../../rateLimit.js';

const registerLimit = createLimiter({ name: 'register', windowMs: 60_000, max: 20 });

export async function handleAuthRegister(ctx, res) {
  const limit = registerLimit(ctx.req);
  if (!limit.ok) {
    res.setHeader?.('Retry-After', String(Math.ceil(limit.retryAfterMs / 1000)));
    jsonErr(res, 429, 'Too many attempts, try again soon', 'RATE_LIMITED');
    return;
  }
  const ct = ctx.req.headers['content-type'] ?? '';
  if (!ct.includes('application/json')) {
    jsonErr(res, 415, 'Unsupported media type', 'UNSUPPORTED_MEDIA_TYPE');
    return;
  }
  let body;
  try {
    body = await readJsonBody(ctx.req);
  } catch (e) {
    if (e.code === 'PAYLOAD_TOO_LARGE') {
      jsonErr(res, 413, 'Payload too large', 'PAYLOAD_TOO_LARGE');
      return;
    }
    jsonErr(res, 400, 'Invalid JSON', 'INVALID_JSON');
    return;
  }
  const result = await registerWithBody(body ?? {});
  if (!result.ok && result.code === 'INVALID_CREDENTIALS') {
    jsonErr(res, 400, 'username and password required', 'INVALID_CREDENTIALS');
    return;
  }
  if (!result.ok && result.code === 'INVALID_USERNAME') {
    jsonErr(
      res,
      400,
      'username must be 2-24 chars, lowercase letters, digits, dot, dash, or underscore',
      'INVALID_USERNAME',
    );
    return;
  }
  if (!result.ok && result.code === 'INVALID_PASSWORD') {
    jsonErr(res, 400, 'password must be at least 6 characters', 'INVALID_PASSWORD');
    return;
  }
  if (!result.ok && result.code === 'USERNAME_TAKEN') {
    jsonErr(res, 409, 'Username already registered', 'USERNAME_TAKEN');
    return;
  }
  if (!result.ok) {
    jsonErr(res, 400, 'Invalid request', 'INVALID_REQUEST');
    return;
  }
  if (result.token) {
    res.setHeader('Set-Cookie', buildSessionCookie(result.token));
  }
  jsonOk(res, { user: result.user }, 201);
}
