import { hashPassword, verifyPassword } from './password.js';

const USERNAME_PATTERN = /^[a-z0-9][a-z0-9_.-]{1,23}$/;
const MIN_PASSWORD_LEN = 6;
const MAX_PASSWORD_LEN = 256;

const users = new Map();

function normalizeUsername(name) {
  if (typeof name !== 'string') return '';
  return name.trim().toLowerCase();
}

function validUsername(name) {
  return USERNAME_PATTERN.test(name);
}

function validPassword(pw) {
  return typeof pw === 'string' && pw.length >= MIN_PASSWORD_LEN && pw.length <= MAX_PASSWORD_LEN;
}

export function createUser(username, password) {
  const key = normalizeUsername(username);
  if (!validUsername(key)) {
    return { ok: false, code: 'INVALID_USERNAME' };
  }
  if (!validPassword(password)) {
    return { ok: false, code: 'INVALID_PASSWORD' };
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
