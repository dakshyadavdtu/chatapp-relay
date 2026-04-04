import { fetchSession, login, logout } from '../../api/auth.js';

export const authState = {
  status: 'unknown',
  user: null,
  sessionChecked: false,
  sessionError: null,
  loginStatus: 'idle',
  loginError: null,
  logoutStatus: 'idle',
  logoutError: null,
};

export function applySessionResult(result) {
  if (result.authenticated && result.user) {
    authState.user = result.user;
    authState.status = 'signed_in';
    authState.sessionChecked = true;
    authState.sessionError = null;
    return;
  }
  authState.user = null;
  authState.status = 'signed_out';
  authState.sessionChecked = true;
  authState.sessionError = null;
}

export function setAuthUser(user) {
  authState.user = user;
  authState.status = user ? 'signed_in' : 'signed_out';
  authState.sessionChecked = true;
  authState.sessionError = null;
}

export async function loadSession() {
  authState.status = 'checking';
  authState.sessionError = null;
  try {
    const session = await fetchSession();
    applySessionResult(session);
    return session;
  } catch {
    authState.user = null;
    authState.status = 'signed_out';
    authState.sessionChecked = true;
    authState.sessionError = 'session_check_failed';
    return { authenticated: false };
  }
}

export async function performLogin(username, password) {
  authState.loginStatus = 'loading';
  authState.loginError = null;
  authState.sessionError = null;
  try {
    const res = await login(username, password);
    const user = res?.data?.user ?? res?.user ?? null;
    if (!user) {
      throw new Error('Invalid credentials');
    }
    // Refresh session from server to align state with cookie.
    await loadSession();
    authState.loginStatus = 'idle';
    return user;
  } catch (e) {
    authState.loginStatus = 'error';
    authState.loginError = e?.code ?? e?.message ?? 'login_failed';
    setAuthUser(null);
    throw e;
  }
}

export async function performLogout() {
  authState.sessionError = null;
  try {
    await logout();
  } catch {
    /* ignore logout errors */
  }
  setAuthUser(null);
}
