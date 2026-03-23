import { handleHealth } from './handlers/health.js';
import { routes } from './routes.js';

export function createHttpHandler() {
  return (req, res) => {
    const path = req.url?.split('?')[0] ?? '/';
    const handler = routes[path];
    if (handler) {
      handler(req, res);
      return;
    }
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('not found\n');
  };
}

