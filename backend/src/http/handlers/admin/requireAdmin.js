import { getSession } from '../../../auth/session.js';
import { getUserById } from '../../../auth/users.js';
import { jsonErr } from '../../json.js';

export async function requireAdmin(ctx, res) {
  const session = await getSession(ctx.req);
  if (!session?.user?.id) {
    jsonErr(res, 401, 'Not authenticated', 'UNAUTHORIZED');
    return null;
  }
  const record = getUserById(session.user.id);
  if (!record || record.role !== 'admin') {
    jsonErr(res, 403, 'Admin role required', 'FORBIDDEN');
    return null;
  }
  return record;
}
