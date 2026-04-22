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

function toPublicUser(record) {
  return {
    id: record.id,
    username: record.username,
    role: record.role ?? 'user',
    createdAt: record.createdAt,
  };
}

export function createUser(username, password, opts = {}) {
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
  const role = opts?.role === 'admin' ? 'admin' : 'user';
  const record = {
    id: key,
    username: key,
    passwordHash: hashPassword(password),
    role,
    createdAt: Date.now(),
  };
  users.set(key, record);
  return { ok: true, user: toPublicUser(record) };
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
  return { ok: true, user: toPublicUser(record) };
}

export function getUserByUsername(username) {
  const record = users.get(normalizeUsername(username));
  if (!record) return null;
  return toPublicUser(record);
}

export function getUserById(userId) {
  if (typeof userId !== 'string') return null;
  const record = users.get(userId);
  return record ? toPublicUser(record) : null;
}

export function listUsers() {
  return [...users.values()]
    .map(toPublicUser)
    .sort((a, b) => a.username.localeCompare(b.username));
}

export function setUserRole(userId, role) {
  const record = users.get(userId);
  if (!record) return { ok: false, code: 'USER_NOT_FOUND' };
  record.role = role === 'admin' ? 'admin' : 'user';
  return { ok: true, user: toPublicUser(record) };
}

export function ensureRootAdmin({ username, password }) {
  const key = normalizeUsername(username);
  if (!validUsername(key) || !validPassword(password)) {
    return { ok: false, code: 'INVALID_ADMIN_CONFIG' };
  }
  const existing = users.get(key);
  if (existing) {
    existing.role = 'admin';
    return { ok: true, user: toPublicUser(existing) };
  }
  return createUser(key, password, { role: 'admin' });
}

export function resetUsersForTest() {
  users.clear();
}
