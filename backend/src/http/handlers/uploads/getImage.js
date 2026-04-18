import { getImageUpload } from '../../../uploads/store.js';

export async function handleUploadImageGet(ctx, res) {
  if (ctx.method !== 'GET' && ctx.method !== 'HEAD') {
    res.writeHead(405, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('method not allowed');
    return;
  }

  const uploadId = ctx.params?.uploadId;
  const row = getImageUpload(uploadId);
  if (!row) {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('not found');
    return;
  }

  const headers = {
    'Content-Type': row.mimeType,
    'Content-Length': row.buffer.length,
    'Cache-Control': 'private, max-age=3600',
  };
  if (ctx.method === 'HEAD') {
    res.writeHead(200, headers);
    res.end();
    return;
  }
  res.writeHead(200, headers);
  res.end(row.buffer);
}
