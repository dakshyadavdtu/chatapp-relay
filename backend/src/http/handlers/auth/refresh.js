import { refreshWithRequest } from '../../../auth/service.js';
import { jsonErr, jsonOk } from '../../json.js';

export async function handleAuthRefresh(ctx, res) {
  const out = await refreshWithRequest(ctx.req);
  if (!out) {
    jsonErr(res, 401, 'Not authenticated', 'UNAUTHORIZED');
    return;
  }
  jsonOk(res, { ok: true });
}
