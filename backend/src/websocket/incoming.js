import { onPresenceMessage } from './presence.js';

const handlers = {
  ping(_ws, _parsed, ctx) {
    ctx.send({ type: 'pong', ts: Date.now() });
  },
  presence(ws, parsed, ctx) {
    onPresenceMessage(ws, parsed, ctx);
  },
};

export function routeIncomingJson(ws, parsed, ctx) {
  const t = typeof parsed?.type === 'string' ? parsed.type : '';
  const handler = handlers[t];
  if (handler) {
    handler(ws, parsed, ctx);
  }
}

