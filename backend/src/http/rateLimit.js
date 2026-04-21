const buckets = new Map();

function getClientKey(req) {
  const fwd = req.headers?.['x-forwarded-for'];
  if (typeof fwd === 'string' && fwd.trim()) {
    return fwd.split(',')[0].trim();
  }
  return req.socket?.remoteAddress ?? 'unknown';
}

export function createLimiter({ name, windowMs, max }) {
  return function check(req) {
    const now = Date.now();
    const key = `${name}:${getClientKey(req)}`;
    const rec = buckets.get(key);
    if (!rec || now - rec.windowStart >= windowMs) {
      buckets.set(key, { windowStart: now, count: 1 });
      return { ok: true, remaining: max - 1, retryAfterMs: 0 };
    }
    if (rec.count >= max) {
      const retryAfterMs = windowMs - (now - rec.windowStart);
      return { ok: false, remaining: 0, retryAfterMs };
    }
    rec.count += 1;
    return { ok: true, remaining: max - rec.count, retryAfterMs: 0 };
  };
}

export function resetLimitersForTest() {
  buckets.clear();
}
