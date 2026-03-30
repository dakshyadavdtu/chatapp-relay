import { wsUrl } from '../config/ws.js';
import { setConnectionStatus } from './connectionState.js';

export function getWebSocketUrl() {
  return wsUrl();
}

const BASE_RECONNECT_MS = 1000;
const MAX_RECONNECT_MS = 30000;

export function startJsonSocket({ onJson, onStatus }) {
  let ws = null;
  let reconnectTimer = null;
  let stopped = false;
  let reconnectAttempt = 0;
  let lastStatus = 'closed';

  const emitStatus = (s) => {
    lastStatus = s;
    if (typeof onStatus === 'function') {
      onStatus(s);
    }
  };

  const clearReconnectTimer = () => {
    if (reconnectTimer != null) {
      clearTimeout(reconnectTimer);
      reconnectTimer = null;
    }
  };

  const scheduleReconnect = () => {
    if (stopped) {
      return;
    }
    clearReconnectTimer();
    const delay = Math.min(
      MAX_RECONNECT_MS,
      BASE_RECONNECT_MS * 2 ** reconnectAttempt,
    );
    reconnectAttempt += 1;
    reconnectTimer = setTimeout(() => {
      reconnectTimer = null;
      connect();
    }, delay);
  };

  const connect = () => {
    if (stopped) {
      return;
    }
    emitStatus('connecting');
    setConnectionStatus(reconnectAttempt > 0 ? 'reconnecting' : 'connecting', { reconnectAttempt });
    let socket;
    try {
      socket = new WebSocket(getWebSocketUrl());
    } catch {
      emitStatus('closed');
      scheduleReconnect();
      return;
    }
    ws = socket;

    const onMessage = (ev) => {
      let parsed;
      try {
        parsed = JSON.parse(ev.data);
      } catch {
        return;
      }
      if (parsed && typeof parsed === 'object' && typeof onJson === 'function') {
        onJson(parsed);
      }
    };

    socket.addEventListener('message', onMessage);
    socket.addEventListener('open', () => {
      reconnectAttempt = 0;
      emitStatus('open');
      setConnectionStatus('connected', { reconnectAttempt: 0 });
    });
    socket.addEventListener('close', () => {
      socket.removeEventListener('message', onMessage);
      if (ws === socket) {
        ws = null;
      }
      emitStatus('closed');
      setConnectionStatus('disconnected');
      if (!stopped) {
        scheduleReconnect();
      }
    });
  };

  connect();

  return {
    stop() {
      stopped = true;
      clearReconnectTimer();
      if (ws) {
        try {
          ws.close();
        } catch {}
        ws = null;
      }
      emitStatus('closed');
      setConnectionStatus('disconnected');
    },
    send(payload) {
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(payload));
      }
    },
    getStatus() {
      return lastStatus;
    },
  };
}
