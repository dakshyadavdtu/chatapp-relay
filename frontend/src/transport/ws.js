import { wsUrl } from '../config/ws.js';

export function getWebSocketUrl() {
  return wsUrl();
}

export function connectJsonWebSocket(onJson) {
  let ws;
  try {
    ws = new WebSocket(getWebSocketUrl());
  } catch {
    return () => {};
  }
  const onMessage = (ev) => {
    let parsed;
    try {
      parsed = JSON.parse(ev.data);
    } catch {
      return;
    }
    if (parsed && typeof parsed === 'object') {
      onJson(parsed);
    }
  };
  ws.addEventListener('message', onMessage);
  return () => {
    ws.removeEventListener('message', onMessage);
    try {
      ws.close();
    } catch {}
  };
}
