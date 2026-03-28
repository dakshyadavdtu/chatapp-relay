import { randomUUID } from 'node:crypto';
import { dispatchIncomingMessage } from './messages.js';
import { onConnectionClose, onConnectionOpen } from './presence.js';

function sendJson(ws, payload) {
  ws.send(JSON.stringify(payload));
}

export function handleConnection(ws, req, hooks = {}) {
  const ctx = {
    id: randomUUID(),
    remoteAddress: req.socket?.remoteAddress ?? null,
    path: typeof req.url === 'string' ? req.url : null,
    connectedAt: Date.now(),
    ws,
    send(payload) {
      sendJson(ws, payload);
    },
  };
  if (typeof hooks.onOpen === 'function') {
    hooks.onOpen(ctx);
  }
  onConnectionOpen(ctx);
  let closed = false;
  const closeOnce = () => {
    if (closed) {
      return;
    }
    closed = true;
    if (typeof hooks.onClose === 'function') {
      hooks.onClose(ctx);
    }
    onConnectionClose(ctx);
  };
  ws.on('message', (data) => {
    dispatchIncomingMessage(ws, data, ctx);
  });
  ws.on('close', closeOnce);
  ws.on('error', closeOnce);
}
