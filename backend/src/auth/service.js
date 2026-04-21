import { createSession, deleteSession, getSession } from './session.js';
import { getCookie } from './cookies.js';
import { authenticate, createUser } from './users.js';

export async function loginWithPassword(username, password) {
  const result = authenticate(username, password);
  if (!result.ok) {
    return result;
  }
  const session = createSession(result.user);
  return { ok: true, user: result.user, token: session.token };
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

export async function registerWithBody(body) {
  const username = body?.username;
  const password = body?.password;
  if (typeof username !== 'string' || typeof password !== 'string') {
    return { ok: false, code: 'INVALID_CREDENTIALS' };
  }
  const created = createUser(username, password);
  if (!created.ok) {
    return created;
  }
  const session = createSession(created.user);
  return { ok: true, user: created.user, token: session.token };
}
