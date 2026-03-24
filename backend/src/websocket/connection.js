import { randomUUID } from 'node:crypto';
import { dispatchIncomingMessage } from './messages.js';
import { onConnectionClose, onConnectionOpen } from './presence.js';

export function handleConnection(ws, req) {
  const ctx = {
    id: randomUUID(),
    remoteAddress: req.socket?.remoteAddress ?? null,
  };
  onConnectionOpen(ctx);
  let closed = false;
  const closeOnce = () => {
    if (closed) {
      return;
    }
    closed = true;
    onConnectionClose(ctx);
  };
  ws.on('message', (data) => {
    dispatchIncomingMessage(ws, data, ctx);
  });
  ws.on('close', closeOnce);
  ws.on('error', closeOnce);
}
