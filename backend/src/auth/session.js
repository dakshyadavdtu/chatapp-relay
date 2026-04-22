import { randomUUID } from 'node:crypto';
import { getCookie } from './cookies.js';

const DEFAULT_TTL_MS = 24 * 60 * 60 * 1000;

function readTtlMs() {
  const raw = process.env.SESSION_TTL_MS;
  if (!raw) return DEFAULT_TTL_MS;
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) return DEFAULT_TTL_MS;
  return n;
}

const sessions = new Map();

function isExpired(record, now = Date.now()) {
  if (!record) return true;
  const ttl = readTtlMs();
  return now - (record.touchedAt ?? record.createdAt) > ttl;
}

export function createSession(user) {
  const token = `sid_${randomUUID()}`;
  const now = Date.now();
  sessions.set(token, { user, createdAt: now, touchedAt: now });
  return { token, user };
}

export function deleteSession(token) {
  if (token) {
    sessions.delete(token);
  }
}

export function getSessionByToken(token) {
  if (!token) return null;
  const record = sessions.get(token);
  if (!record) return null;
  if (isExpired(record)) {
    sessions.delete(token);
    return null;
  }
  return record;
}

export function touchSession(token) {
  if (!token) return null;
  const record = sessions.get(token);
  if (!record) return null;
  if (isExpired(record)) {
    sessions.delete(token);
    return null;
  }
  record.touchedAt = Date.now();
  return record;
}

export async function getSession(req) {
  const token = getCookie(req, 'sid');
  if (!token) {
    return null;
  }
  return getSessionByToken(token);
}

export function resetSessionsForTest() {
  sessions.clear();
}
