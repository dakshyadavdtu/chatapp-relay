import { hashPassword, verifyPassword } from './password.js';

const users = new Map();

function normalizeUsername(name) {
  if (typeof name !== 'string') return '';
  return name.trim().toLowerCase();
}

export function createUser(username, password) {
  const key = normalizeUsername(username);
  if (!key) {
    return { ok: false, code: 'INVALID_CREDENTIALS' };
  }
  if (typeof password !== 'string' || password.length === 0) {
    return { ok: false, code: 'INVALID_CREDENTIALS' };
  }
  if (users.has(key)) {
    return { ok: false, code: 'USERNAME_TAKEN' };
  }
  const record = {
    id: `user:${key}`,
    username: key,
    passwordHash: hashPassword(password),
    createdAt: Date.now(),
  };
  users.set(key, record);
  return { ok: true, user: { id: record.id, username: record.username } };
}

export function authenticate(username, password) {
  const key = normalizeUsername(username);
  if (!key) {
    return { ok: false, code: 'INVALID_CREDENTIALS' };
  }
  const record = users.get(key);
  if (!record) {
    return { ok: false, code: 'INVALID_CREDENTIALS' };
  }
  if (!verifyPassword(password, record.passwordHash)) {
    return { ok: false, code: 'INVALID_CREDENTIALS' };
  }
  return { ok: true, user: { id: record.id, username: record.username } };
}

export function getUserByUsername(username) {
  const record = users.get(normalizeUsername(username));
  if (!record) return null;
  return { id: record.id, username: record.username };
}

export function resetUsersForTest() {
  users.clear();
}
