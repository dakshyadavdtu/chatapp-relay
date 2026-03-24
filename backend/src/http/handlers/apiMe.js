import { getSession } from '../../auth/session.js';
import { writeJson } from '../json.js';

export async function handleApiMe(req, res) {
  const method = req.method ?? 'GET';
  if (method !== 'GET' && method !== 'HEAD') {
    writeJson(res, 405, {
      success: false,
      error: 'Method not allowed',
      code: 'METHOD_NOT_ALLOWED',
    });
    return;
  }
  if (method === 'HEAD') {
    res.writeHead(204, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end();
    return;
  }
  const session = await getSession(req);
  if (!session) {
    writeJson(res, 401, {
      success: false,
      error: 'Not authenticated',
      code: 'UNAUTHORIZED',
    });
    return;
  }
  writeJson(res, 200, {
    success: true,
    data: { user: session.user },
  });
}
