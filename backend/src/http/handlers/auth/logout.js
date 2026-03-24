import { logoutWithRequest } from '../../../auth/service.js';
import { jsonOk } from '../../json.js';

export async function handleAuthLogout(ctx, res) {
  await logoutWithRequest(ctx.req);
  jsonOk(res, { ok: true });
}
