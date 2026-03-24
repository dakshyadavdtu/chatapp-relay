export const authState = {
  status: 'unknown',
  user: null,
};

export function setAuthUser(user) {
  authState.user = user;
  authState.status = user ? 'signed_in' : 'signed_out';
}
