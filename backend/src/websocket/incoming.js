import { onPresenceMessage } from './presence.js';

export function routeIncomingJson(ws, parsed, ctx) {
  const t = typeof parsed?.type === 'string' ? parsed.type : '';
  if (t === 'ping') {
    ws.send(JSON.stringify({ type: 'pong', ts: Date.now() }));
    return;
  }
  if (t === 'presence') {
    onPresenceMessage(ws, parsed, ctx);
    return;
  }
  if (t === 'chat') {
    handleChatIncoming(ws, parsed, ctx);
    return;
  }
  if (t === 'message') {
    handleMessageIncoming(ws, parsed, ctx);
    return;
  }
}

function handleChatIncoming(_ws, _parsed, _ctx) {}

function handleMessageIncoming(_ws, _parsed, _ctx) {}
