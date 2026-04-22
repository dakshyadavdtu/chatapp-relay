import { MessageType } from './protocol.js';
import { forEachConnection } from './connections.js';

export function notifyUserStatus(userId, status) {
  if (!userId) return;
  const payload = {
    type: MessageType.PRESENCE,
    userId: String(userId),
    status,
    ts: Date.now(),
  };
  forEachConnection((ctx) => {
    if (ctx.userId === userId) return;
    ctx.send(payload);
  });
}

export function onConnectionOpen(_ctx) {}
export function onConnectionClose(_ctx) {}
export function onPresenceMessage(_ws, _msg, _ctx) {}
