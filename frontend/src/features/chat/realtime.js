import { applyIncomingMessageCreated } from './state.js';
import { connectJsonWebSocket } from '../../transport/ws.js';

let disconnect = null;

export function startChatRealtime() {
  stopChatRealtime();
  disconnect = connectJsonWebSocket((msg) => {
    if (msg?.type === 'message.created' && msg.message && typeof msg.message === 'object') {
      applyIncomingMessageCreated(msg.message);
    }
  });
}

export function stopChatRealtime() {
  if (disconnect) {
    disconnect();
    disconnect = null;
  }
}
