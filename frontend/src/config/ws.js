const WS_PATH = '/ws';

function hasPath(url) {
  const afterScheme = url.replace(/^wss?:\/\//, '');
  return afterScheme.includes('/');
}

function ensureWsPath(base) {
  const trimmed = base.replace(/\/$/, '');
  if (hasPath(trimmed)) {
    return trimmed;
  }
  return `${trimmed}${WS_PATH}`;
}

function sameOriginWs() {
  if (typeof window === 'undefined' || !window.location) {
    return `ws://localhost:3000${WS_PATH}`;
  }
  const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${proto}//${window.location.host}${WS_PATH}`;
}

export function wsUrl() {
  const raw = import.meta?.env?.VITE_WS_URL;
  if (raw) {
    return ensureWsPath(raw);
  }
  return sameOriginWs();
}
