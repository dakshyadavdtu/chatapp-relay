import { routes } from './routes.js';

export function createHttpHandler() {
  return (req, res) => {
    const path = req.url?.split('?')[0] ?? '/';
    const handler = routes[path];
    if (handler) {
      return Promise.resolve(handler(req, res)).catch((err) => {
        if (res.headersSent) {
          return;
        }
        res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('internal error\n');
        console.error(err);
      });
    }
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('not found\n');
  };
}

