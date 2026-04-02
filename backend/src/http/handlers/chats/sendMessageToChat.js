import { readJsonBody } from '../../body.js';
import { jsonErr, jsonOk } from '../../json.js';
import { getChatService } from '../../../chat/service.js';
import { getUserId } from '../../../chat/user.js';

export async function handleApiChatSendToChat(ctx, res) {
  if (ctx.method !== 'POST') {
    jsonErr(res, 405, 'Method not allowed', 'METHOD_NOT_ALLOWED');
    return;
  }

  const chatId = ctx.params?.chatId;
  if (!chatId || typeof chatId !== 'string') {
    jsonErr(res, 400, 'chatId required', 'BAD_REQUEST');
    return;
  }

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
  const out = await getChatService().sendMessageToChat(userId, chatId, payload);
  if (!out.ok) {
    jsonErr(res, out.status, out.message, out.code);
    return;
  }
  jsonOk(res, out.data, out.status);
}
