import { writeJson } from '../json.js';

export function handleApiHealth(req, res) {
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
  writeJson(res, 200, {
    success: true,
    data: { ok: true },
  });
}
