import { randomUUID } from 'node:crypto';
import { getCookie } from './cookies.js';

const sessions = new Map();

export function createSession(user) {
  const token = `sid_${randomUUID()}`;
  sessions.set(token, { user, createdAt: Date.now() });
  return { token, user };
}

export function deleteSession(token) {
  if (token) {
    sessions.delete(token);
  }
}

export function getSessionByToken(token) {
  if (!token) return null;
  return sessions.get(token) ?? null;
}

export async function getSession(req) {
  const token = getCookie(req, 'sid');
  if (!token) {
    return null;
  }
  return getSessionByToken(token);
}
