export function getCookie(req, name) {
  const raw = req.headers?.cookie;
  if (!raw || typeof raw !== 'string') {
    return null;
  }
  const parts = raw.split(';');
  for (const part of parts) {
    const idx = part.indexOf('=');
    if (idx === -1) {
      continue;
    }
    const k = part.slice(0, idx).trim();
    if (k !== name) {
      continue;
    }
    let v = part.slice(idx + 1).trim();
    try {
      v = decodeURIComponent(v);
    } catch {
      /* keep raw */
    }
    return v;
  }
  return null;
}
