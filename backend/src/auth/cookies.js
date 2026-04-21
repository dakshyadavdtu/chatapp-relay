import { loadConfig } from '../config/env.js';

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

function cookieFlags() {
  const cfg = loadConfig();
  const parts = ['Path=/', 'HttpOnly'];
  parts.push(`SameSite=${cfg.cookieSameSite}`);
  if (cfg.cookieSecure || cfg.cookieSameSite === 'None') {
    parts.push('Secure');
  }
  return parts.join('; ');
}

export function buildSessionCookie(token) {
  return `sid=${token}; ${cookieFlags()}`;
}

export function buildClearSessionCookie() {
  return `sid=; ${cookieFlags()}; Max-Age=0`;
}
