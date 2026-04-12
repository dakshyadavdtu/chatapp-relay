import {
  applyIncomingMessage,
  recoverAfterReconnect,
} from './state.js';
import { startJsonSocket } from '../../transport/ws.js';
import { subscribeConnection } from '../../transport/connectionState.js';
import { setAuthUser } from '../auth/state.js';
import { navigate } from '../../app/router.js';

let session = null;
let unsubConn = null;
let lastStatus = 'disconnected';
let reconnectSyncId = 0;

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

  async function restoreAfterReconnect() {
    const syncId = ++reconnectSyncId;
    await recoverAfterReconnect();
    if (syncId !== reconnectSyncId) {
      return;
    }
  }

  unsubConn = subscribeConnection((st) => {
    const justRecovered =
      st.status === 'connected' &&
      lastStatus !== 'connected' &&
      Number.isFinite(st.reconnectAttempt) &&
      st.reconnectAttempt > 0;
    if (justRecovered) {
      void restoreAfterReconnect();
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
