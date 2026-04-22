import { MessageType, PROTOCOL_VERSION } from './protocol.js';
import { handleTypingStart, handleTypingStop } from './handlers/typing.js';
import { handlePresenceList } from './handlers/presence.js';
import { handleMessageRead, handleMessageDelivered } from './handlers/ack.js';

function replyPongLowercase(ctx) {
  ctx.send({ type: 'pong', ts: Date.now(), version: PROTOCOL_VERSION });
}

function replyPongUppercase(ctx) {
  ctx.send({ type: MessageType.PONG, ts: Date.now(), version: PROTOCOL_VERSION });
}

function replyHelloAck(ctx) {
  ctx.send({
    type: MessageType.HELLO_ACK,
    version: PROTOCOL_VERSION,
    userId: ctx.userId ?? null,
    ts: Date.now(),
  });
}

const handlers = {
  ping(_ws, _parsed, ctx) {
    replyPongLowercase(ctx);
  },
  PING(_ws, _parsed, ctx) {
    replyPongUppercase(ctx);
  },
  HELLO(_ws, _parsed, ctx) {
    replyHelloAck(ctx);
  },
  TYPING_START: handleTypingStart,
  TYPING_STOP: handleTypingStop,
  PRESENCE_LIST: handlePresenceList,
  MESSAGE_READ: handleMessageRead,
  MESSAGE_READ_CONFIRM: handleMessageRead,
  MESSAGE_DELIVERED: handleMessageDelivered,
  MESSAGE_DELIVERED_CONFIRM: handleMessageDelivered,
};

export function routeIncomingJson(ws, parsed, ctx) {
  const t = typeof parsed?.type === 'string' ? parsed.type : '';
  const handler = handlers[t];
  if (handler) {
    handler(ws, parsed, ctx);
  }
}
