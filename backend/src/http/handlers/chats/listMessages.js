import { jsonErr, jsonOk } from '../../json.js';
import { getChatService } from '../../../chat/service.js';
import { getUserId } from '../../../chat/user.js';

export async function handleApiChatMessagesList(ctx, res) {
  if (ctx.method !== 'GET' && ctx.method !== 'HEAD') {
    jsonErr(res, 405, 'Method not allowed', 'METHOD_NOT_ALLOWED');
    return;
  }
  if (ctx.method === 'HEAD') {
    res.writeHead(204, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end();
    return;
  }

  const chatId = ctx.params?.chatId;
  if (!chatId || typeof chatId !== 'string') {
    jsonErr(res, 400, 'chatId required', 'BAD_REQUEST');
    return;
  }

  const userId = await getUserId(ctx.req);
  const out = await getChatService().messageListBody(userId, chatId, ctx.query);
  if (!out.ok) {
    jsonErr(res, out.status, out.message, out.code);
    return;
  }
  jsonOk(res, out.data);
}
