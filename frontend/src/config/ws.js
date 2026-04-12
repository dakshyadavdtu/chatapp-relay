export function wsUrl() {
  const raw = import.meta?.env?.VITE_WS_URL;
  if (raw) {
    return raw.replace(/\/$/, '');
  }
  return 'ws://localhost:3000';
}
