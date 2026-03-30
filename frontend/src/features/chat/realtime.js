import { applyIncomingMessage } from './state.js';
import { startJsonSocket } from '../../transport/ws.js';

let session = null;

const handlers = {
  MESSAGE_RECEIVE(msg) {
    if (msg?.message && typeof msg.message === 'object') {
      applyIncomingMessage(msg.message);
    }
  },
  pong(msg) {
    // keeping connection alive quietly
  },
};

export function getChatSocketStatus() {
  return session?.getStatus() ?? 'closed';
}

export function startChatRealtime() {
  stopChatRealtime();
  session = startJsonSocket({
    onJson(msg) {
      if (!msg?.type) return;
      const fn = handlers[msg.type];
      if (fn) {
        fn(msg);
      }
    },
  });
}

export function stopChatRealtime() {
  if (session) {
    session.stop();
    session = null;
  }
}
