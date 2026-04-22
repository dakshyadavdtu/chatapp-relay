import { MessageType } from '../protocol.js';
import { getOnlineUserIds } from '../connections.js';

export function handlePresenceList(_ws, _parsed, ctx) {
  const online = getOnlineUserIds();
  ctx.send({
    type: MessageType.PRESENCE_SNAPSHOT,
    users: online.map((id) => ({ userId: id, status: 'online' })),
    ts: Date.now(),
  });
}
