import { jsonErr, jsonOk } from '../../json.js';
import { getChatService } from '../../../chat/service.js';
import { getUserId } from '../../../chat/user.js';

export async function handleApiChatsList(ctx, res) {
  if (ctx.method !== 'GET' && ctx.method !== 'HEAD') {
    jsonErr(res, 405, 'Method not allowed', 'METHOD_NOT_ALLOWED');
    return;
  }
  if (ctx.method === 'HEAD') {
    res.writeHead(204, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end();
    return;
  }

  const userId = await getUserId(ctx.req);
  const body = await getChatService().chatListBody(userId);
  jsonOk(res, body);
}
