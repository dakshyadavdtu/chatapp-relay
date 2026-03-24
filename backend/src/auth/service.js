export async function loginWithPassword(_username, _password) {
  return null;
}

export async function refreshWithRequest(_req) {
  return null;
}

export async function logoutWithRequest(_req) {
  return { ok: true };
}

export async function registerWithBody(_body) {
  return { ok: false, code: 'NOT_IMPLEMENTED' };
}
