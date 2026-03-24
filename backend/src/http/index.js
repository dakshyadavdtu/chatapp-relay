import { createRequestContext } from './request.js';
import { match } from './routes.js';

export function createHttpHandler() {
  return (req, res) => {
    const ctx = createRequestContext(req);
    const handler = match(ctx.method, ctx.path);
    if (handler) {
      return Promise.resolve(handler(ctx, res)).catch((err) => {
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

