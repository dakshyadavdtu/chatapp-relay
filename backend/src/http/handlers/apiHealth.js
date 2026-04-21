import { jsonErr, jsonOk } from '../json.js';
import { getHealth } from '../../services/health.js';

export function handleApiHealth(ctx, res) {
  if (ctx.method !== 'GET' && ctx.method !== 'HEAD') {
    jsonErr(res, 405, 'Method not allowed', 'METHOD_NOT_ALLOWED');
    return;
  }
  if (ctx.method === 'HEAD') {
    res.writeHead(204, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end();
    return;
  }
  const h = getHealth();
  jsonOk(res, {
    ok: h.ok,
    uptimeMs: h.uptimeMs,
    startedAt: h.startedAt,
    now: h.now,
  });
}
