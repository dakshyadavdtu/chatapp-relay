import { getHealth } from '../services/health.js';

export function handleHealth(req, res) {
  const h = getHealth();
  res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
  res.end(h.ok ? 'ok\n' : 'error\n');
}
