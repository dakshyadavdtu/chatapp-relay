import { getChat, listChats, listMessages, openChat, sendMessage, sendMessageToChat } from '../../api/chat.js';
import {
  messageKey,
  normalizeChatMessage,
  normalizeMessageListForChat,
  sortMessagesOldestFirst,
  findMessageIndex,
} from './messageList.js';

export const chatState = {
  activeChatId: null,
  activeChat: null,
  activeChatStatus: 'idle',
  activeChatError: null,
  shellStatus: 'idle',
  shellError: null,
  chats: [],
  loadStatus: 'idle',
  loadError: null,
  messagesByChat: {},
  sendStatus: 'idle',
  sendError: null,
};

const chatApi = {
  sendMessageToChat,
};

export function setChatApi(api) {
  if (api?.sendMessageToChat) {
    chatApi.sendMessageToChat = api.sendMessageToChat;
  }
}

export function resetChatApi() {
  chatApi.sendMessageToChat = sendMessageToChat;
}

const messageListeners = new Set();

export function subscribeChatMessages(fn) {
  messageListeners.add(fn);
  return () => messageListeners.delete(fn);
}

function notifyChatMessages(chatId) {
  for (const fn of messageListeners) {
    try {
      fn(chatId);
    } catch {}
  }
}

export function applyIncomingMessage(raw) {
  const chatId = raw?.chatId;
  if (!chatId) {
    return;
  }
  const row = normalizeChatMessage(raw, chatId);
  if (!row) {
    return;
  }
  const prev = chatState.messagesByChat[chatId] ?? {
    items: [],
    meta: null,
    status: 'idle',
    error: null,
  };
  const items = Array.isArray(prev.items) ? prev.items : [];
  const existIdx = findMessageIndex(items, row);
  
  let nextItems;
  if (existIdx >= 0) {
    const merged = { ...items[existIdx], ...row };
    if (items[existIdx].clientId && !row.clientId) {
      merged.clientId = items[existIdx].clientId;
    }
    nextItems = [...items];
    nextItems[existIdx] = merged;
  } else {
    nextItems = [...items, row];
  }
  
  chatState.messagesByChat[chatId] = {
    ...prev,
    items: sortMessagesOldestFirst(nextItems),
    status: prev.status === 'error' ? prev.status : 'ok',
    error: prev.error,
  };
  notifyChatMessages(chatId);
}

export function setActiveChatId(chatId) {
  if (chatState.activeChatId !== chatId) {
    chatState.activeChat = null;
    chatState.activeChatStatus = 'idle';
    chatState.activeChatError = null;
  }
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

export function resetChatState() {
  chatState.activeChatId = null;
  chatState.activeChat = null;
  chatState.activeChatStatus = 'idle';
  chatState.activeChatError = null;
  chatState.shellStatus = 'idle';
  chatState.shellError = null;
  chatState.chats = [];
  chatState.loadStatus = 'idle';
  chatState.loadError = null;
  chatState.messagesByChat = {};
  chatState.sendStatus = 'idle';
  chatState.sendError = null;
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
      setActiveChatId(chatState.chats[0].chatId);
    }
  } catch (e) {
    chatState.chats = [];
    chatState.loadStatus = 'error';
    chatState.loadError = e?.code ?? 'fetch_failed';
  }
}

export async function bootstrapChatShell() {
  chatState.shellStatus = 'loading';
  chatState.shellError = null;
  await loadChats();
  if (chatState.loadStatus === 'error') {
    chatState.shellStatus = 'error';
    chatState.shellError = chatState.loadError;
    return { ok: false, code: chatState.loadError };
  }

  if (!chatState.activeChatId && chatState.chats.length === 0) {
    chatState.shellStatus = 'empty';
    chatState.shellError = null;
    return { ok: true, empty: true };
  }

  if (!chatState.activeChatId && chatState.chats.length > 0) {
    setActiveChatId(chatState.chats[0].chatId);
  }

  if (chatState.activeChatId) {
    await openActiveChat(chatState.activeChatId);
  }

  if (chatState.activeChatStatus === 'error') {
    chatState.shellStatus = 'error';
    chatState.shellError = chatState.activeChatError;
    return { ok: false, code: chatState.activeChatError };
  }

  chatState.shellStatus = 'ready';
  chatState.shellError = null;
  return { ok: true };
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
      items: normalizeMessageListForChat(r.data.messages, chatId, chatState.messagesByChat[chatId].items),
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

export async function openActiveChat(chatId) {
  if (!chatId) {
    chatState.activeChat = null;
    chatState.activeChatStatus = 'idle';
    chatState.activeChatError = null;
    return;
  }
  chatState.activeChatId = chatId;
  chatState.activeChatStatus = 'loading';
  chatState.activeChatError = null;
  chatState.messagesByChat[chatId] = {
    items: chatState.messagesByChat[chatId]?.items ?? [],
    meta: chatState.messagesByChat[chatId]?.meta ?? null,
    status: 'loading',
    error: null,
  };
  try {
    const r = await openChat(chatId);
    if (chatId !== chatState.activeChatId) {
      return;
    }
    if (!r?.success || !r?.data?.chat) {
      chatState.activeChat = null;
      chatState.activeChatStatus = 'error';
      chatState.activeChatError = 'bad_response';
      chatState.messagesByChat[chatId] = {
        items: [],
        meta: null,
        status: 'error',
        error: 'bad_response',
      };
      return;
    }
    chatState.activeChat = r.data.chat;
    chatState.activeChatStatus = 'ok';
    const items = Array.isArray(r.data.messages)
      ? normalizeMessageListForChat(r.data.messages, chatId, chatState.messagesByChat[chatId].items)
      : [];
    chatState.messagesByChat[chatId] = {
      items,
      meta: r.data.meta ?? null,
      status: 'ok',
      error: null,
    };
    notifyChatMessages(chatId);
  } catch (e) {
    if (chatId !== chatState.activeChatId) {
      return;
    }
    chatState.activeChat = null;
    chatState.activeChatStatus = 'error';
    chatState.activeChatError = e?.code ?? 'fetch_failed';
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
    if (chatId !== chatState.activeChatId) {
      return; // Skip assignment if user switched chats while loading
    }
    if (!r?.success || !r?.data?.chat) {
      chatState.activeChat = null;
      chatState.activeChatStatus = 'error';
      chatState.activeChatError = 'bad_response';
      return;
    }
    chatState.activeChat = r.data.chat;
    chatState.activeChatStatus = 'ok';
  } catch (e) {
    if (chatId !== chatState.activeChatId) {
      return;
    }
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

export async function refreshActiveChat() {
  const chatId = chatState.activeChatId;
  if (!chatId) return;
  await openActiveChat(chatId);
}

export async function sendActiveMessage(content) {
  const chatId = chatState.activeChatId;
  if (!chatId) {
    chatState.sendStatus = 'error';
    chatState.sendError = 'NO_ACTIVE_CHAT';
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
  
  const clientId = `tmp_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
  applyIncomingMessage({
    clientId,
    chatId,
    content,
    createdAt: Date.now(),
    state: 'PENDING',
  });

  try {
    const res = await chatApi.sendMessageToChat(chatId, content, clientId);
    if (res?.success === false) {
      throw { code: res.code ?? 'SEND_FAILED' };
    }
    chatState.sendStatus = 'ok';
    chatState.sendError = null;
    const msg = res?.data?.message;
    if (msg && msg.chatId) {
      applyIncomingMessage(msg);
    }
    return { ok: true, data: msg ?? null };
  } catch (e) {
    const existingItems = chatState.messagesByChat[chatId]?.items ?? [];
    const existIdx = findMessageIndex(existingItems, { clientId, chatId });
    if (existIdx >= 0) {
      const ext = existingItems[existIdx];
      if (ext.id || ext.state === 'SENT') {
        // The message was acknowledged via socket although HTTP timed out/failed.
        chatState.sendStatus = 'ok';
        chatState.sendError = null;
        return { ok: true, data: ext };
      }
    }
    chatState.sendStatus = 'error';
    chatState.sendError = e?.code ?? 'SEND_FAILED';
    applyIncomingMessage({
      clientId,
      chatId,
      content,
      state: 'ERROR',
    });
    return { ok: false, code: chatState.sendError };
  }
}
