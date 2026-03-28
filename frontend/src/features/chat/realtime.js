import { applyIncomingMessageCreated } from './state.js';
import { startJsonSocket } from '../../transport/ws.js';

let session = null;

export function getChatSocketStatus() {
  return session?.getStatus() ?? 'closed';
}

export function startChatRealtime() {
  stopChatRealtime();
  session = startJsonSocket({
    onJson(msg) {
      if (msg?.type === 'message.created' && msg.message && typeof msg.message === 'object') {
        applyIncomingMessageCreated(msg.message);
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
