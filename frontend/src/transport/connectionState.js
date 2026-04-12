let state = {
  status: 'disconnected',
  reconnectAttempt: 0,
  nextRetryMs: null,
  closeCode: null,
  closeReason: '',
  wasClean: false,
  recoveredAt: null,
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
