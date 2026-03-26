import { readJsonBody } from '../../body.js';
import { jsonErr, jsonOk } from '../../json.js';
import { getChatService } from '../../../chat/service.js';
import { getUserId } from '../../../chat/user.js';

export async function handleApiChatSend(ctx, res) {
  const ct = ctx.req.headers['content-type'] ?? '';
  if (!ct.includes('application/json')) {
    jsonErr(res, 415, 'Unsupported media type', 'UNSUPPORTED_MEDIA_TYPE');
    return;
  }

  let payload;
  try {
    payload = await readJsonBody(ctx.req);
  } catch (e) {
    if (e.code === 'PAYLOAD_TOO_LARGE') {
      jsonErr(res, 413, 'Payload too large', 'PAYLOAD_TOO_LARGE');
      return;
    }
    jsonErr(res, 400, 'Invalid JSON', 'INVALID_JSON');
    return;
  }

  const userId = await getUserId(ctx.req);
  const out = await getChatService().sendMessageBody(userId, payload);
  if (!out.ok) {
    jsonErr(res, out.status, out.message, out.code);
    return;
  }
  jsonOk(res, out.data, out.status);
}

