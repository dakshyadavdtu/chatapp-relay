export const authState = {
  status: 'unknown',
  user: null,
};

export function applySessionResult(result) {
  if (result.authenticated && result.user) {
    authState.user = result.user;
    authState.status = 'signed_in';
    return;
  }
  authState.user = null;
  authState.status = 'signed_out';
}

export function setAuthUser(user) {
  authState.user = user;
  authState.status = user ? 'signed_in' : 'signed_out';
}
