function setHeaderSafe(res, name, value) {
  if (typeof res.setHeader === 'function') {
    res.setHeader(name, value);
  }
}

export function applySecurityHeaders(_req, res) {
  setHeaderSafe(res, 'X-Content-Type-Options', 'nosniff');
  setHeaderSafe(res, 'X-Frame-Options', 'DENY');
  setHeaderSafe(res, 'Referrer-Policy', 'no-referrer');
  setHeaderSafe(res, 'X-DNS-Prefetch-Control', 'off');
}
