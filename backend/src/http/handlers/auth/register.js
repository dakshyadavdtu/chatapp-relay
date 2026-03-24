import { registerWithBody } from '../../../auth/service.js';
import { readJsonBody } from '../../body.js';
import { jsonErr } from '../../json.js';

export async function handleAuthRegister(ctx, res) {
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
  if (!result.ok && result.code === 'NOT_IMPLEMENTED') {
    jsonErr(res, 501, 'Not implemented', 'NOT_IMPLEMENTED');
    return;
  }
  jsonErr(res, 400, 'Invalid request', 'INVALID_REQUEST');
}
