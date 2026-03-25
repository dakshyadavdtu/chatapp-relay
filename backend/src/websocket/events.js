import { onPresenceMessage } from './presence.js';

export function routeClientEvent(ws, msg, ctx) {
  const t = typeof msg?.type === 'string' ? msg.type : '';
  if (t === 'ping') {
    ws.send(JSON.stringify({ type: 'pong', ts: Date.now() }));
    return;
  }
  if (t === 'presence') {
    onPresenceMessage(ws, msg, ctx);
    return;
  }
  if (t === 'chat') {
    onChatEvent(ws, msg, ctx);
    return;
  }
  if (t === 'message') {
    onMessageEvent(ws, msg, ctx);
    return;
  }
}

export function onChatEvent(_ws, _msg, _ctx) {}

export function onMessageEvent(_ws, _msg, _ctx) {}
