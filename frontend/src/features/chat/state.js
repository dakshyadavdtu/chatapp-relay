import {
  getChat,
  listChats,
  listMessages,
  markChatRead,
  openChat,
  sendMessageToChat,
} from '../../api/chat.js';
import { authState } from '../auth/state.js';
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
  readStatusByChat: {},
  readErrorByChat: {},
};

const chatApi = {
  sendMessageToChat,
  markChatRead,
};

export function setChatApi(api) {
  if (api?.sendMessageToChat) {
    chatApi.sendMessageToChat = api.sendMessageToChat;
  }
  if (api?.markChatRead) {
    chatApi.markChatRead = api.markChatRead;
  }
}

export function resetChatApi() {
  chatApi.sendMessageToChat = sendMessageToChat;
  chatApi.markChatRead = markChatRead;
}

const messageListeners = new Set();
const lastReadSyncByChat = new Map();
const forcedReadByChat = new Map();

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

function sortChatsNewestFirst(list) {
  return [...list].sort((a, b) => {
    const ta = Number.isFinite(a?.updatedAt) ? a.updatedAt : 0;
    const tb = Number.isFinite(b?.updatedAt) ? b.updatedAt : 0;
    if (ta !== tb) {
      return tb - ta;
    }
    return String(a?.chatId ?? '').localeCompare(String(b?.chatId ?? ''));
  });
}

function currentUserId() {
  return authState.user?.id ?? 'u1';
}

function buildLastMessageFromRow(row) {
  const createdAt = Number.isFinite(row?.createdAt) ? row.createdAt : Date.now();
  return {
    id: row?.messageId ?? row?.id ?? null,
    senderId: row?.senderId ?? null,
    content: typeof row?.content === 'string' ? row.content : '',
    createdAt,
  };
}

function upsertChatSummaryFromMessage(row, opts = {}) {
  const chatId = row?.chatId;
  if (!chatId) {
    return;
  }
  const incrementUnread = opts.incrementUnread === true;
  const clearUnread = opts.clearUnread === true;
  const lastMessage = buildLastMessageFromRow(row);
  const updatedAt = lastMessage.createdAt;
  const idx = chatState.chats.findIndex((chat) => chat.chatId === chatId);
  if (idx >= 0) {
    const current = chatState.chats[idx];
    const baseUnread = Number.isFinite(current?.unreadCount) ? current.unreadCount : 0;
    const unreadCount = clearUnread ? 0 : baseUnread + (incrementUnread ? 1 : 0);
    const next = {
      ...current,
      unreadCount: Math.max(0, unreadCount),
      updatedAt: Number.isFinite(current?.updatedAt)
        ? Math.max(current.updatedAt, updatedAt)
        : updatedAt,
      lastMessage,
    };
    const chats = [...chatState.chats];
    chats[idx] = next;
    chatState.chats = sortChatsNewestFirst(chats);
    return;
  }
  const me = currentUserId();
  const participants = [row?.senderId, row?.recipientId]
    .filter((id) => typeof id === 'string' && id.trim() !== '' && id !== me);
  chatState.chats = sortChatsNewestFirst([
    ...chatState.chats,
    {
      chatId,
      type: 'direct',
      title: null,
      participants,
      unreadCount: incrementUnread ? 1 : 0,
      updatedAt,
      lastMessage,
    },
  ]);
}

function setChatUnreadCount(chatId, unreadCount) {
  if (!chatId) {
    return;
  }
  const idx = chatState.chats.findIndex((chat) => chat.chatId === chatId);
  if (idx < 0) {
    return;
  }
  const chats = [...chatState.chats];
  chats[idx] = {
    ...chats[idx],
    unreadCount: Math.max(0, Number.isFinite(unreadCount) ? unreadCount : 0),
  };
  chatState.chats = chats;
}

function setChatReadStatus(chatId, status, error = null) {
  if (!chatId) {
    return;
  }
  chatState.readStatusByChat[chatId] = status;
  chatState.readErrorByChat[chatId] = error;
}

function latestMessageIdForChat(chatId) {
  const items = chatState.messagesByChat[chatId]?.items ?? [];
  if (!Array.isArray(items) || items.length === 0) {
    return null;
  }
  const last = items[items.length - 1];
  const messageId = last?.messageId ?? last?.id ?? null;
  return messageId ? String(messageId) : null;
}

function shouldPersistRead(chatId) {
  if (!chatId || chatId !== chatState.activeChatId) {
    return false;
  }
  const items = chatState.messagesByChat[chatId]?.items ?? [];
  if (!Array.isArray(items) || items.length === 0) {
    return false;
  }
  const latest = items[items.length - 1];
  const me = currentUserId();
  if (!latest?.senderId || latest.senderId === me) {
    return false;
  }
  const messageId = latest.messageId ?? latest.id;
  return Boolean(messageId);
}

async function persistChatRead(chatId, lastReadMessageId) {
  if (!chatId || !lastReadMessageId) {
    return;
  }
  const key = `${chatId}:${lastReadMessageId}`;
  if (lastReadSyncByChat.get(chatId) === key) {
    return;
  }
  lastReadSyncByChat.set(chatId, key);
  setChatReadStatus(chatId, 'saving', null);
  notifyChatMessages(chatId);
  try {
    const out = await chatApi.markChatRead(chatId, lastReadMessageId);
    if (!out?.success) {
      throw { code: out?.code ?? 'READ_SYNC_FAILED' };
    }
    const unreadCount = Number.isFinite(out?.data?.unreadCount) ? out.data.unreadCount : 0;
    const storedMessageId =
      typeof out?.data?.lastReadMessageId === 'string' && out.data.lastReadMessageId.trim()
        ? out.data.lastReadMessageId
        : lastReadMessageId;
    setChatUnreadCount(chatId, unreadCount);
    forcedReadByChat.set(chatId, storedMessageId);
    setChatReadStatus(chatId, 'ok', null);
    void loadChats();
  } catch (e) {
    lastReadSyncByChat.delete(chatId);
    forcedReadByChat.delete(chatId);
    setChatReadStatus(chatId, 'error', e?.code ?? 'READ_SYNC_FAILED');
  }
  notifyChatMessages(chatId);
}

function scheduleActiveChatRead(chatId) {
  if (!shouldPersistRead(chatId)) {
    return;
  }
  const latestId = latestMessageIdForChat(chatId);
  if (!latestId) {
    return;
  }
  void persistChatRead(chatId, latestId);
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
    status: 'ok',
    error: null,
  };
  const me = currentUserId();
  const isFromOtherUser = typeof row.senderId === 'string' ? row.senderId !== me : false;
  const isActiveChat = chatId === chatState.activeChatId;
  if (!isActiveChat && isFromOtherUser && existIdx < 0) {
    forcedReadByChat.delete(chatId);
  }
  upsertChatSummaryFromMessage(row, {
    incrementUnread: !isActiveChat && isFromOtherUser && existIdx < 0,
    clearUnread: isActiveChat,
  });
  if (isActiveChat && isFromOtherUser) {
    scheduleActiveChatRead(chatId);
  }
  if (
    chatId === chatState.activeChatId &&
    chatState.sendStatus === 'sending' &&
    existIdx >= 0 &&
    items[existIdx]?.state === 'PENDING' &&
    row.state === 'SENT'
  ) {
    chatState.sendStatus = 'ok';
    chatState.sendError = null;
  }
  notifyChatMessages(chatId);
}

export function setActiveChatId(chatId) {
  if (chatState.activeChatId !== chatId) {
    chatState.activeChat = null;
    chatState.activeChatStatus = 'idle';
    chatState.activeChatError = null;
  }
  chatState.activeChatId = chatId;
  setChatUnreadCount(chatId, 0);
  if (chatId) {
    setChatReadStatus(chatId, 'idle', null);
    forcedReadByChat.set(chatId, latestMessageIdForChat(chatId) ?? '__active__');
  }
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
  chatState.readStatusByChat = {};
  chatState.readErrorByChat = {};
  lastReadSyncByChat.clear();
  forcedReadByChat.clear();
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
    const localChatsById = new Map(chatState.chats.map((chat) => [chat.chatId, chat]));
    chatState.chats = sortChatsNewestFirst(
      r.data.chats.map((chat) => {
        const local = localChatsById.get(chat.chatId) ?? null;
        const remoteUpdatedAt = Number.isFinite(chat?.updatedAt) ? chat.updatedAt : 0;
        const localUpdatedAt = Number.isFinite(local?.updatedAt) ? local.updatedAt : 0;
        const remoteUnread = Number.isFinite(chat?.unreadCount) ? chat.unreadCount : 0;
        const localUnread = Number.isFinite(local?.unreadCount) ? local.unreadCount : 0;
        const hasReadLock = forcedReadByChat.has(chat.chatId);
        let unreadCount = remoteUnread;
        if (chat.chatId === chatState.activeChatId || hasReadLock) {
          unreadCount = 0;
        } else if (localUpdatedAt > remoteUpdatedAt) {
          unreadCount = localUnread;
        }
        return {
          ...chat,
          unreadCount,
          updatedAt: localUpdatedAt > remoteUpdatedAt ? localUpdatedAt : remoteUpdatedAt,
          lastMessage: localUpdatedAt > remoteUpdatedAt
            ? local?.lastMessage ?? chat?.lastMessage ?? null
            : chat?.lastMessage ?? local?.lastMessage ?? null,
        };
      }),
    );
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
    if (chatState.activeChatId) {
      setChatUnreadCount(chatState.activeChatId, 0);
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
    if (chatId === chatState.activeChatId) {
      scheduleActiveChatRead(chatId);
    }
    notifyChatMessages(chatId);
  } catch (e) {
    chatState.messagesByChat[chatId] = {
      items: [],
      meta: null,
      status: 'error',
      error: e?.code ?? 'fetch_failed',
    };
    notifyChatMessages(chatId);
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
    setChatUnreadCount(chatId, 0);
    const items = Array.isArray(r.data.messages)
      ? normalizeMessageListForChat(r.data.messages, chatId, chatState.messagesByChat[chatId].items)
      : [];
    chatState.messagesByChat[chatId] = {
      items,
      meta: r.data.meta ?? null,
      status: 'ok',
      error: null,
    };
    scheduleActiveChatRead(chatId);
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

export async function recoverAfterReconnect() {
  const activeBefore = chatState.activeChatId;
  await loadChats();
  const activeExists = activeBefore
    ? chatState.chats.some((chat) => chat.chatId === activeBefore)
    : false;
  if (activeExists) {
    if (chatState.activeChatId !== activeBefore) {
      setActiveChatId(activeBefore);
    }
    await openActiveChat(activeBefore);
    return { ok: true, chatId: activeBefore };
  }
  if (chatState.activeChatId) {
    await openActiveChat(chatState.activeChatId);
    return { ok: true, chatId: chatState.activeChatId };
  }
  return { ok: true, chatId: null };
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
