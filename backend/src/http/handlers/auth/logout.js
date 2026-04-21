import { logoutWithRequest } from '../../../auth/service.js';
import { buildClearSessionCookie } from '../../../auth/cookies.js';
import { jsonOk } from '../../json.js';

export async function handleAuthLogout(ctx, res) {
  await logoutWithRequest(ctx.req);
  res.setHeader('Set-Cookie', buildClearSessionCookie());
  jsonOk(res, {});
}
