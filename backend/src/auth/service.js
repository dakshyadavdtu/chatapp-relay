import { createSession, deleteSession, getSession } from './session.js';
import { getCookie } from './cookies.js';

export async function loginWithPassword(username, password) {
  const name = typeof username === 'string' ? username.trim() : '';
  const pass = typeof password === 'string' ? password : '';
  if (!name || !pass) {
    return { ok: false, code: 'INVALID_CREDENTIALS' };
  }
  const user = { id: `user:${name}`, username: name };
  const session = createSession(user);
  return { ok: true, user, token: session.token };
}

export async function refreshWithRequest(req) {
  const session = await getSession(req);
  if (!session) {
    return { ok: false, code: 'UNAUTHORIZED' };
  }
  return { ok: true, user: session.user };
}

export async function logoutWithRequest(req) {
  const token = getCookie(req, 'sid');
  deleteSession(token);
  return { ok: true };
}

export async function registerWithBody(_body) {
  return { ok: false, code: 'NOT_IMPLEMENTED' };
}
