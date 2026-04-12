import { wsUrl } from '../config/ws.js';
import { setConnectionStatus } from './connectionState.js';
import { isAuthCloseCode } from './wsCodes.js';

export function getWebSocketUrl() {
  return wsUrl();
}

const BASE_RECONNECT_MS = 1000;
const MAX_RECONNECT_MS = 30000;
const MAX_RECONNECT_ATTEMPTS = 8;
const RECONNECT_JITTER_MS = 250;
function isAuthCloseEvent(ev) {
  const code = Number.isFinite(ev?.code) ? ev.code : null;
  if (isAuthCloseCode(code)) {
    return true;
  }
  const reason = typeof ev?.reason === 'string' ? ev.reason.toLowerCase() : '';
  if (!reason) {
    return false;
  }
  return (
    reason.includes('auth') ||
    reason.includes('unauthorized') ||
    reason.includes('session') ||
    reason.includes('logout')
  );
}

export function startJsonSocket({ onJson, onStatus, onAuthClose }) {
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
    if (reconnectAttempt >= MAX_RECONNECT_ATTEMPTS) {
      setConnectionStatus('reconnect_failed', {
        reconnectAttempt,
        nextRetryMs: null,
      });
      return;
    }
    clearReconnectTimer();
    const baseDelay = Math.min(
      MAX_RECONNECT_MS,
      BASE_RECONNECT_MS * 2 ** reconnectAttempt,
    );
    const jitter = Math.floor(Math.random() * RECONNECT_JITTER_MS);
    const delay = baseDelay + jitter;
    reconnectAttempt += 1;
    setConnectionStatus('reconnecting', {
      reconnectAttempt,
      nextRetryMs: delay,
    });
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
    setConnectionStatus(reconnectAttempt > 0 ? 'reconnecting' : 'connecting', {
      reconnectAttempt,
      nextRetryMs: null,
    });
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
      const recovered = reconnectAttempt > 0;
      reconnectAttempt = 0;
      emitStatus('open');
      setConnectionStatus('connected', {
        reconnectAttempt: 0,
        nextRetryMs: null,
        recoveredAt: recovered ? Date.now() : null,
        closeCode: null,
        closeReason: '',
        wasClean: true,
      });
    });
    socket.addEventListener('close', (ev) => {
      socket.removeEventListener('message', onMessage);
      if (ws === socket) {
        ws = null;
      }
      if (!stopped && isAuthCloseEvent(ev)) {
        stopped = true;
        clearReconnectTimer();
        emitStatus('closed');
        const payload = {
          reconnectAttempt,
          nextRetryMs: null,
          closeCode: Number.isFinite(ev?.code) ? ev.code : null,
          closeReason: typeof ev?.reason === 'string' ? ev.reason : '',
          wasClean: Boolean(ev?.wasClean),
        };
        setConnectionStatus('auth_failed', payload);
        if (typeof onAuthClose === 'function') {
          onAuthClose(payload);
        }
        return;
      }
      emitStatus('closed');
      setConnectionStatus('disconnected', {
        reconnectAttempt,
        nextRetryMs: null,
        closeCode: Number.isFinite(ev?.code) ? ev.code : null,
        closeReason: typeof ev?.reason === 'string' ? ev.reason : '',
        wasClean: Boolean(ev?.wasClean),
      });
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
      setConnectionStatus('disconnected', { reconnectAttempt: 0, nextRetryMs: null });
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
