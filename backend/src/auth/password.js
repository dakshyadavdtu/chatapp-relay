import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';

const SCRYPT_N = 16384;
const SCRYPT_R = 8;
const SCRYPT_P = 1;
const KEY_LEN = 64;
const SALT_LEN = 16;

export function hashPassword(password) {
  if (typeof password !== 'string' || password.length === 0) {
    throw new Error('password required');
  }
  const salt = randomBytes(SALT_LEN);
  const derived = scryptSync(password, salt, KEY_LEN, {
    N: SCRYPT_N,
    r: SCRYPT_R,
    p: SCRYPT_P,
  });
  return `scrypt$${SCRYPT_N}$${SCRYPT_R}$${SCRYPT_P}$${salt.toString('hex')}$${derived.toString('hex')}`;
}

export function verifyPassword(password, stored) {
  if (typeof password !== 'string' || typeof stored !== 'string') {
    return false;
  }
  const parts = stored.split('$');
  if (parts.length !== 6 || parts[0] !== 'scrypt') {
    return false;
  }
  const n = Number(parts[1]);
  const r = Number(parts[2]);
  const p = Number(parts[3]);
  if (!Number.isFinite(n) || !Number.isFinite(r) || !Number.isFinite(p)) {
    return false;
  }
  let saltBuf;
  let expectedBuf;
  try {
    saltBuf = Buffer.from(parts[4], 'hex');
    expectedBuf = Buffer.from(parts[5], 'hex');
  } catch {
    return false;
  }
  const derived = scryptSync(password, saltBuf, expectedBuf.length, { N: n, r, p });
  if (derived.length !== expectedBuf.length) {
    return false;
  }
  return timingSafeEqual(derived, expectedBuf);
}
