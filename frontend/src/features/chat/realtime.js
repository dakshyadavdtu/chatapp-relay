import { applyIncomingMessage, loadChats, refreshActiveChat } from './state.js';
import { startJsonSocket } from '../../transport/ws.js';
import { subscribeConnection } from '../../transport/connectionState.js';
import { setAuthUser } from '../auth/state.js';
import { navigate } from '../../app/router.js';

let session = null;
let unsubConn = null;
let lastStatus = 'disconnected';

export function toIncomingChatMessage(msg) {
  if (!msg || typeof msg !== 'object') {
    return null;
  }
  if (msg.message && typeof msg.message === 'object') {
    return msg.message;
  }
  const chatId = msg.chatId ?? null;
  const messageId = msg.messageId ?? msg.id ?? null;
  if (!chatId || !messageId) {
    return null;
  }
  return {
    id: messageId,
    messageId,
    clientId: msg.clientId ?? null,
    chatId,
    senderId: msg.senderId ?? null,
    recipientId: msg.recipientId ?? null,
    content: typeof msg.content === 'string' ? msg.content : '',
    createdAt: msg.createdAt ?? msg.timestamp ?? null,
    state: msg.state ?? 'SENT',
  };
}

const handlers = {
  MESSAGE_RECEIVE(msg) {
    const incoming = toIncomingChatMessage(msg);
    if (incoming) {
      applyIncomingMessage(incoming);
    }
  },
  pong(_msg) {},
};

export function getChatSocketStatus() {
  return session?.getStatus() ?? 'closed';
}

export function startChatRealtime() {
  if (session) {
    return;
  }

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
    onAuthClose() {
      stopChatRealtime();
      setAuthUser(null);
      navigate('/');
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
  lastStatus = 'disconnected';
}
