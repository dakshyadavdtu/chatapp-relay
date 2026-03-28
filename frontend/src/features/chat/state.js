import { getChat, listChats, listMessages, sendMessage } from '../../api/chat.js';

export const chatState = {
  activeChatId: null,
  activeChat: null,
  activeChatStatus: 'idle',
  activeChatError: null,
  chats: [],
  loadStatus: 'idle',
  loadError: null,
  messagesByChat: {},
  sendStatus: 'idle',
  sendError: null,
};

const messageListeners = new Set();

export function subscribeChatMessages(fn) {
  messageListeners.add(fn);
  return () => messageListeners.delete(fn);
}

function notifyChatMessages() {
  for (const fn of messageListeners) {
    try {
      fn();
    } catch {}
  }
}

export function applyIncomingMessageCreated(raw) {
  const chatId = raw?.chatId;
  const id = raw?.id ?? raw?.messageId;
  if (!chatId || id == null || id === '') {
    return;
  }
  const prev = chatState.messagesByChat[chatId] ?? {
    items: [],
    meta: null,
    status: 'idle',
    error: null,
  };
  const items = Array.isArray(prev.items) ? prev.items : [];
  if (items.some((m) => String(m.id) === String(id))) {
    return;
  }
  const row = {
    id,
    chatId,
    senderId: raw.senderId ?? null,
    content: typeof raw.content === 'string' ? raw.content : '',
    createdAt: raw.createdAt ?? null,
  };
  const nextItems = [...items, row].sort(
    (a, b) => (a.createdAt ?? 0) - (b.createdAt ?? 0),
  );
  chatState.messagesByChat[chatId] = {
    ...prev,
    items: nextItems,
    status: prev.status === 'error' ? prev.status : 'ok',
    error: prev.error,
  };
  if (chatId === chatState.activeChatId) {
    notifyChatMessages();
  }
}

export function setActiveChatId(chatId) {
  chatState.activeChatId = chatId;
  chatState.sendStatus = 'idle';
  chatState.sendError = null;
}

export function getActiveRecipientId() {
  const list = Array.isArray(chatState.activeChat?.participants)
    ? chatState.activeChat.participants
    : [];
  const id = list.find((v) => typeof v === 'string' && v.trim() !== '');
  return id ?? null;
}

export async function loadChats() {
  chatState.loadStatus = 'loading';
  chatState.loadError = null;
  try {
    const r = await listChats();
    if (r?.success === false && r?.code === 'NOT_AVAILABLE') {
      chatState.chats = [];
      chatState.loadStatus = 'error';
      chatState.loadError = 'not_available';
      return;
    }
    if (!r?.success || !Array.isArray(r?.data?.chats)) {
      chatState.chats = [];
      chatState.loadStatus = 'error';
      chatState.loadError = 'bad_response';
      return;
    }
    chatState.chats = r.data.chats;
    chatState.loadStatus = 'ok';
    if (
      chatState.activeChatId &&
      !chatState.chats.some((c) => c.chatId === chatState.activeChatId)
    ) {
      chatState.activeChatId = null;
      chatState.activeChat = null;
      chatState.activeChatStatus = 'idle';
      chatState.activeChatError = null;
    }
    if (!chatState.activeChatId && chatState.chats.length > 0) {
      chatState.activeChatId = chatState.chats[0].chatId;
    }
  } catch (e) {
    chatState.chats = [];
    chatState.loadStatus = 'error';
    chatState.loadError = e?.code ?? 'fetch_failed';
  }
}

export async function loadMessages(chatId) {
  if (!chatId) {
    return;
  }
  chatState.messagesByChat[chatId] = {
    items: chatState.messagesByChat[chatId]?.items ?? [],
    meta: chatState.messagesByChat[chatId]?.meta ?? null,
    status: 'loading',
    error: null,
  };
  try {
    const r = await listMessages(chatId);
    if (!r?.success || !Array.isArray(r?.data?.messages)) {
      chatState.messagesByChat[chatId] = {
        items: [],
        meta: null,
        status: 'error',
        error: 'bad_response',
      };
      return;
    }
    chatState.messagesByChat[chatId] = {
      items: r.data.messages,
      meta: r.data.meta ?? null,
      status: 'ok',
      error: null,
    };
  } catch (e) {
    chatState.messagesByChat[chatId] = {
      items: [],
      meta: null,
      status: 'error',
      error: e?.code ?? 'fetch_failed',
    };
  }
}

export async function loadActiveChat(chatId) {
  if (!chatId) {
    chatState.activeChat = null;
    chatState.activeChatStatus = 'idle';
    chatState.activeChatError = null;
    return;
  }
  chatState.activeChatStatus = 'loading';
  chatState.activeChatError = null;
  try {
    const r = await getChat(chatId);
    if (!r?.success || !r?.data?.chat) {
      chatState.activeChat = null;
      chatState.activeChatStatus = 'error';
      chatState.activeChatError = 'bad_response';
      return;
    }
    chatState.activeChat = r.data.chat;
    chatState.activeChatStatus = 'ok';
  } catch (e) {
    chatState.activeChat = null;
    chatState.activeChatStatus = 'error';
    chatState.activeChatError = e?.code ?? 'fetch_failed';
  }
}

export function getMessagesState(chatId) {
  if (!chatId) {
    return { items: [], meta: null, status: 'idle', error: null };
  }
  return (
    chatState.messagesByChat[chatId] ?? {
      items: [],
      meta: null,
      status: 'idle',
      error: null,
    }
  );
}

export async function sendActiveMessage(content) {
  const chatId = chatState.activeChatId;
  if (!chatId) {
    return { ok: false, code: 'NO_ACTIVE_CHAT' };
  }
  const recipientId = getActiveRecipientId();
  if (!recipientId) {
    chatState.sendStatus = 'error';
    chatState.sendError = 'NO_RECIPIENT';
    return { ok: false, code: 'NO_RECIPIENT' };
  }
  chatState.sendStatus = 'sending';
  chatState.sendError = null;
  try {
    const res = await sendMessage(recipientId, content);
    chatState.sendStatus = 'ok';
    chatState.sendError = null;
    await loadMessages(chatId);
    return { ok: true, data: res?.data?.message ?? null };
  } catch (e) {
    chatState.sendStatus = 'error';
    chatState.sendError = e?.code ?? 'SEND_FAILED';
    return { ok: false, code: chatState.sendError };
  }
}
