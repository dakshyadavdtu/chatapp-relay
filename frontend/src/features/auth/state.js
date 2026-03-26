import { fetchSession } from '../../api/auth.js';

export const authState = {
  status: 'unknown',
  user: null,
  sessionChecked: false,
  sessionError: null,
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
