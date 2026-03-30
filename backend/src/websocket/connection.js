import { randomUUID } from 'node:crypto';
import { dispatchIncomingMessage } from './messages.js';
import { onConnectionClose, onConnectionOpen } from './presence.js';
import { registerUserConnection, removeUserConnection } from './connections.js';

function sendJson(ws, payload) {
  if (ws.readyState === 1) {
    ws.send(JSON.stringify(payload));
  }
}

export function handleConnection(ws, req, hooks = {}) {
  const ctx = {
    id: randomUUID(),
    remoteAddress: req.socket?.remoteAddress ?? null,
    path: typeof req.url === 'string' ? req.url : null,
    connectedAt: Date.now(),
    userId: null,
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
    if (ctx.userId) {
      removeUserConnection(ctx.userId, ctx);
    }
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
