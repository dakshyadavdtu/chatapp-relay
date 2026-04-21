import { loadConfig } from '../config/env.js';

let cached;

function getCorsConfig() {
  if (!cached) {
    const cfg = loadConfig();
    cached = {
      allowedOrigins: cfg.allowedOrigins,
    };
  }
  return cached;
}

export function resetCorsCacheForTest() {
  cached = null;
}

function isAllowedOrigin(origin, allowed) {
  if (!origin) return false;
  if (allowed.length === 0) return false;
  if (allowed.includes('*')) return true;
  return allowed.includes(origin);
}

function setHeaderSafe(res, name, value) {
  if (typeof res.setHeader === 'function') {
    res.setHeader(name, value);
  }
}

export function applyCorsHeaders(req, res) {
  const origin = req.headers?.origin;
  if (!origin) {
    return;
  }

  const { allowedOrigins } = getCorsConfig();
  if (!isAllowedOrigin(origin, allowedOrigins)) {
    return;
  }

  setHeaderSafe(res, 'Vary', 'Origin');
  setHeaderSafe(res, 'Access-Control-Allow-Origin', origin);
  setHeaderSafe(res, 'Access-Control-Allow-Credentials', 'true');
  setHeaderSafe(res, 'Access-Control-Allow-Methods', 'GET,POST,HEAD,OPTIONS');
  setHeaderSafe(
    res,
    'Access-Control-Allow-Headers',
    'Content-Type, Accept, Authorization',
  );
  setHeaderSafe(res, 'Access-Control-Max-Age', '600');
}

export function handlePreflight(req, res) {
  if (req.method !== 'OPTIONS') return false;
  applyCorsHeaders(req, res);
  const reqHeaders = req.headers?.['access-control-request-headers'];
  if (reqHeaders) {
    setHeaderSafe(res, 'Access-Control-Allow-Headers', reqHeaders);
  }
  res.writeHead(204);
  res.end();
  return true;
}
