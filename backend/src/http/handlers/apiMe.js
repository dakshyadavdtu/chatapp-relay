import { getSession } from '../../auth/session.js';
import { jsonErr, jsonOk } from '../json.js';

export async function handleApiMe(ctx, res) {
  if (ctx.method !== 'GET' && ctx.method !== 'HEAD') {
    jsonErr(res, 405, 'Method not allowed', 'METHOD_NOT_ALLOWED');
    return;
  }
  if (ctx.method === 'HEAD') {
    res.writeHead(204, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end();
    return;
  }
  const session = await getSession(ctx.req);
  if (!session) {
    jsonErr(res, 401, 'Not authenticated', 'UNAUTHORIZED');
    return;
  }
  jsonOk(res, { user: session.user });
}
