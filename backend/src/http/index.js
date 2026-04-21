import { createRequestContext } from './request.js';
import { match } from './routes.js';
import { applyCorsHeaders, handlePreflight } from './cors.js';
import { applySecurityHeaders } from './security.js';

export function createHttpHandler() {
  return (req, res) => {
    applySecurityHeaders(req, res);
    if (handlePreflight(req, res)) {
      return;
    }
    applyCorsHeaders(req, res);

    const ctx = createRequestContext(req);
    const matched = match(ctx.method, ctx.path);
    if (matched) {
      ctx.params = matched.params ?? Object.create(null);
      return Promise.resolve(matched.handler(ctx, res)).catch((err) => {
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
