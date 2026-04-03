import { loginWithPassword } from '../../../auth/service.js';
import { readJsonBody } from '../../body.js';
import { jsonErr, jsonOk } from '../../json.js';

export async function handleAuthLogin(ctx, res) {
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
  const username = body?.username;
  const password = body?.password;
  if (typeof username !== 'string' || typeof password !== 'string') {
    jsonErr(res, 400, 'username and password required', 'INVALID_CREDENTIALS');
    return;
  }
  if (username.trim() === '' || password.length === 0) {
    jsonErr(res, 400, 'username and password required', 'INVALID_CREDENTIALS');
    return;
  }
  const out = await loginWithPassword(username.trim(), password);
  if (!out?.ok) {
    jsonErr(res, 401, 'Invalid username or password', 'INVALID_CREDENTIALS');
    return;
  }
  if (out.token) {
    res.setHeader('Set-Cookie', `sid=${out.token}; Path=/; HttpOnly`);
  }
  jsonOk(res, { user: out.user });
}
