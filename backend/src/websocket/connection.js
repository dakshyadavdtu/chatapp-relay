import { randomUUID } from 'node:crypto';
import { dispatchIncomingMessage } from './messages.js';
import { onConnectionClose, onConnectionOpen } from './presence.js';
import { registerUserConnection, removeUserConnection } from './connections.js';
import { getSession } from '../auth/session.js';
import { getCookie } from '../auth/cookies.js';

function sendJson(ws, payload) {
  if (ws.readyState === 1) {
    ws.send(JSON.stringify(payload));
  }
}

export function handleConnection(ws, req, hooks = {}) {
  let closed = false;
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
  void getSession(req)
    .then((session) => {
      if (closed) {
        return;
      }
      const sid = getCookie(req, 'sid');
      if (sid && !session) {
        ws.close(4401, 'unauthorized');
        return;
      }
      const userId = session?.user?.id ?? 'u1';
      ctx.userId = String(userId);
      registerUserConnection(ctx.userId, ctx);
    })
    .catch(() => {});
  onConnectionOpen(ctx);
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
