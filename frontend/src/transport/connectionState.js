let state = {
  status: 'disconnected',
  reconnectAttempt: 0,
};

const listeners = new Set();

export function getConnectionState() {
  return { ...state };
}

export function setConnectionStatus(status, extra = {}) {
  state = { ...state, status, ...extra };
  for (const fn of listeners) {
    try { fn(state); } catch {}
  }
}

export function subscribeConnection(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
