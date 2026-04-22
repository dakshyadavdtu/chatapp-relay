import { refreshWithRequest } from '../../../auth/service.js';
import { buildSessionCookie } from '../../../auth/cookies.js';
import { jsonErr, jsonOk } from '../../json.js';

export async function handleAuthRefresh(ctx, res) {
  const out = await refreshWithRequest(ctx.req);
  if (!out?.ok) {
    jsonErr(res, 401, 'Not authenticated', 'UNAUTHORIZED');
    return;
  }
  if (out.token) {
    res.setHeader('Set-Cookie', buildSessionCookie(out.token));
  }
  jsonOk(res, { user: out.user });
}
