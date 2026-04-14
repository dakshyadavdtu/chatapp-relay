import { jsonErr, jsonOk } from '../../json.js';
import { getChatService } from '../../../chat/service.js';
import { getUserId } from '../../../chat/user.js';

export async function handleApiChatsSearch(ctx, res) {
  if (ctx.method !== 'GET' && ctx.method !== 'HEAD') {
    jsonErr(res, 405, 'Method not allowed', 'METHOD_NOT_ALLOWED');
    return;
  }
  if (ctx.method === 'HEAD') {
    res.writeHead(204, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end();
    return;
  }

  const q = typeof ctx.query?.get === 'function' ? ctx.query.get('q') ?? '' : '';
  const userId = await getUserId(ctx.req);
  const out = await getChatService().searchChatsBody(userId, q);
  if (!out.ok) {
    jsonErr(res, out.status ?? 400, out.message ?? 'Search failed', out.code ?? 'SEARCH_FAILED');
    return;
  }
  jsonOk(res, out.data);
}
