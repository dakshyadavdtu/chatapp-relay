export function createRequestContext(req) {
  const rawUrl = req.url ?? '/';
  const q = rawUrl.indexOf('?');
  const path = q === -1 ? rawUrl : rawUrl.slice(0, q);
  const search = q === -1 ? '' : rawUrl.slice(q + 1);
  const query = new URLSearchParams(search);
  const method = (req.method ?? 'GET').toUpperCase();
  return { req, method, path, query };
}
