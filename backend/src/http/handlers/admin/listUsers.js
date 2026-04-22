import { jsonErr, jsonOk } from '../../json.js';
import { listUsers } from '../../../auth/users.js';
import { requireAdmin } from './requireAdmin.js';

export async function handleAdminUsersList(ctx, res) {
  if (ctx.method !== 'GET' && ctx.method !== 'HEAD') {
    jsonErr(res, 405, 'Method not allowed', 'METHOD_NOT_ALLOWED');
    return;
  }
  const admin = await requireAdmin(ctx, res);
  if (!admin) return;
  if (ctx.method === 'HEAD') {
    res.writeHead(204, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end();
    return;
  }
  jsonOk(res, { users: listUsers() });
}
