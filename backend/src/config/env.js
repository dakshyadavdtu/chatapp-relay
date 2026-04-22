function readPort() {
  const raw = process.env.PORT;
  if (raw === undefined || raw === '') {
    return 3000;
  }
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) {
    throw new Error('PORT must be a positive number');
  }
  return n;
}

function readAllowedOrigins() {
  const raw = process.env.ALLOWED_ORIGINS;
  if (!raw) return [];
  return raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

function readBoolean(name, fallback = false) {
  const raw = process.env[name];
  if (raw === undefined || raw === '') return fallback;
  return raw === '1' || raw.toLowerCase() === 'true';
}

function readSameSite() {
  const raw = process.env.COOKIE_SAMESITE;
  if (!raw) return 'Lax';
  const v = raw.trim();
  if (v === 'Lax' || v === 'Strict' || v === 'None') return v;
  return 'Lax';
}

function readAdminSeed() {
  const username = process.env.ADMIN_USERNAME;
  const password = process.env.ADMIN_PASSWORD;
  if (!username || !password) return null;
  return { username, password };
}

export function loadConfig() {
  return {
    port: readPort(),
    allowedOrigins: readAllowedOrigins(),
    cookieSecure: readBoolean('COOKIE_SECURE', false),
    cookieSameSite: readSameSite(),
    adminSeed: readAdminSeed(),
  };
}
