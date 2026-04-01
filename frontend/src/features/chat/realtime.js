import { applyIncomingMessage, loadChats, refreshActiveChat } from './state.js';
import { startJsonSocket } from '../../transport/ws.js';
import { subscribeConnection } from '../../transport/connectionState.js';

let session = null;
let unsubConn = null;
let lastStatus = 'disconnected';

const handlers = {
  MESSAGE_RECEIVE(msg) {
    if (msg?.message && typeof msg.message === 'object') {
      applyIncomingMessage(msg.message);
    }
  },
  pong(_msg) {},
};

export function getChatSocketStatus() {
  return session?.getStatus() ?? 'closed';
}

export function startChatRealtime() {
  stopChatRealtime();

  unsubConn = subscribeConnection((st) => {
    if (st.status === 'connected' && lastStatus !== 'connected') {
      void loadChats();
      void refreshActiveChat();
    }
    lastStatus = st.status;
  });

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
  if (unsubConn) {
    unsubConn();
    unsubConn = null;
  }
  if (session) {
    session.stop();
    session = null;
  }
}
