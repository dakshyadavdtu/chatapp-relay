import { logoutWithRequest } from '../../../auth/service.js';
import { jsonOk } from '../../json.js';

export async function handleAuthLogout(ctx, res) {
  await logoutWithRequest(ctx.req);
  res.setHeader('Set-Cookie', 'sid=; Path=/; HttpOnly; Max-Age=0');
  jsonOk(res, { ok: true });
}
