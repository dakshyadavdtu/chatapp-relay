import {
  getChat,
  listChats,
  listMessages,
  markChatRead,
  openChat,
  searchChats,
  uploadChatImage,
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
  uploadStatus: 'idle',
  uploadError: null,
  readStatusByChat: {},
  readErrorByChat: {},
  searchQuery: '',
  searchStatus: 'idle',
  searchError: null,
  searchResults: [],
  typingByChat: {},
  presenceByUser: {},
};

const chatApi = {
  sendMessageToChat,
  markChatRead,
  searchChats,
  uploadChatImage,
};

export function setChatApi(api) {
  if (api?.sendMessageToChat) {
    chatApi.sendMessageToChat = api.sendMessageToChat;
  }
  if (api?.markChatRead) {
    chatApi.markChatRead = api.markChatRead;
  }
  if (api?.searchChats) {
    chatApi.searchChats = api.searchChats;
  }
  if (api?.uploadChatImage) {
    chatApi.uploadChatImage = api.uploadChatImage;
  }
}

export function resetChatApi() {
  chatApi.sendMessageToChat = sendMessageToChat;
  chatApi.markChatRead = markChatRead;
  chatApi.searchChats = searchChats;
  chatApi.uploadChatImage = uploadChatImage;
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
  const messageType = row?.messageType === 'image' ? 'image' : 'text';
  const imageUrl = typeof row?.imageUrl === 'string' ? row.imageUrl : null;
  const rawText = typeof row?.content === 'string' ? row.content : '';
  const content = messageType === 'image' && !rawText.trim() ? '[image]' : rawText;
  return {
    id: row?.messageId ?? row?.id ?? null,
    senderId: row?.senderId ?? null,
    content,
    messageType,
    imageUrl,
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
    if (items[existIdx].imageUrl && !row.imageUrl) {
      merged.imageUrl = items[existIdx].imageUrl;
    }
    if (items[existIdx].imageName && !row.imageName) {
      merged.imageName = items[existIdx].imageName;
    }
    if (items[existIdx].imageMimeType && !row.imageMimeType) {
      merged.imageMimeType = items[existIdx].imageMimeType;
    }
    if (items[existIdx].messageType === 'image' && row.messageType !== 'image') {
      merged.messageType = 'image';
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
  chatState.uploadStatus = 'idle';
  chatState.uploadError = null;
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
  chatState.uploadStatus = 'idle';
  chatState.uploadError = null;
  chatState.readStatusByChat = {};
  chatState.readErrorByChat = {};
  chatState.searchQuery = '';
  chatState.searchStatus = 'idle';
  chatState.searchError = null;
  chatState.searchResults = [];
  chatState.typingByChat = {};
  chatState.presenceByUser = {};
  lastReadSyncByChat.clear();
  forcedReadByChat.clear();
  clearTypingTimers();
}

const TYPING_TIMEOUT_MS = 4000;
const typingTimers = new Map();

function clearTypingTimers() {
  for (const t of typingTimers.values()) {
    clearTimeout(t);
  }
  typingTimers.clear();
}

function scheduleTypingClear(chatId, userId) {
  const key = `${chatId}::${userId}`;
  if (typingTimers.has(key)) {
    clearTimeout(typingTimers.get(key));
  }
  const t = setTimeout(() => {
    typingTimers.delete(key);
    setTypingFor(chatId, userId, false);
    notifyChatMessages(chatId);
  }, TYPING_TIMEOUT_MS);
  typingTimers.set(key, t);
}

function setTypingFor(chatId, userId, isTyping) {
  if (!chatId || !userId) return;
  const map = chatState.typingByChat[chatId] ?? {};
  if (isTyping) {
    map[userId] = Date.now();
  } else {
    delete map[userId];
  }
  chatState.typingByChat = { ...chatState.typingByChat, [chatId]: { ...map } };
}

export function applyTypingEvent(evt) {
  const chatId = typeof evt?.chatId === 'string' ? evt.chatId : '';
  const userId = typeof evt?.userId === 'string' ? evt.userId : '';
  if (!chatId || !userId) return;
  const isStart = evt?.type === 'TYPING_START';
  setTypingFor(chatId, userId, isStart);
  if (isStart) {
    scheduleTypingClear(chatId, userId);
  } else {
    const key = `${chatId}::${userId}`;
    if (typingTimers.has(key)) {
      clearTimeout(typingTimers.get(key));
      typingTimers.delete(key);
    }
  }
  notifyChatMessages(chatId);
}

export function applyPresenceEvent(evt) {
  const userId = typeof evt?.userId === 'string' ? evt.userId : '';
  if (!userId) return;
  const status = evt?.status === 'online' ? 'online' : 'offline';
  chatState.presenceByUser = {
    ...chatState.presenceByUser,
    [userId]: { status, ts: Number.isFinite(evt?.ts) ? evt.ts : Date.now() },
  };
}

export function applyPresenceSnapshot(evt) {
  if (!Array.isArray(evt?.users)) return;
  const next = { ...chatState.presenceByUser };
  const ts = Number.isFinite(evt?.ts) ? evt.ts : Date.now();
  for (const row of evt.users) {
    const userId = typeof row?.userId === 'string' ? row.userId : '';
    if (!userId) continue;
    next[userId] = { status: row.status === 'online' ? 'online' : 'offline', ts };
  }
  chatState.presenceByUser = next;
}

export function applyMessageStateUpdate(evt) {
  const chatId = typeof evt?.chatId === 'string' ? evt.chatId : '';
  const messageId = typeof evt?.messageId === 'string' ? evt.messageId : '';
  const state = typeof evt?.state === 'string' ? evt.state : '';
  if (!chatId || !messageId || !state) return;
  const prev = chatState.messagesByChat[chatId];
  if (!prev || !Array.isArray(prev.items)) return;
  const idx = prev.items.findIndex((row) => row?.id === messageId || row?.messageId === messageId);
  if (idx < 0) return;
  const updated = { ...prev.items[idx], state };
  const nextItems = [...prev.items];
  nextItems[idx] = updated;
  chatState.messagesByChat[chatId] = { ...prev, items: nextItems };
  notifyChatMessages(chatId);
}

const MAX_IMAGE_UPLOAD_BYTES = 2 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/gif', 'image/webp']);

export async function uploadImageForActiveChat(file) {
  if (!chatState.activeChatId) {
    chatState.uploadStatus = 'error';
    chatState.uploadError = 'NO_ACTIVE_CHAT';
    return { ok: false, code: 'NO_ACTIVE_CHAT' };
  }
  if (!file || typeof file !== 'object') {
    chatState.uploadStatus = 'error';
    chatState.uploadError = 'INVALID_FILE';
    return { ok: false, code: 'INVALID_FILE' };
  }
  const mimeType = typeof file.type === 'string' ? file.type : '';
  if (!mimeType.startsWith('image/') || !ALLOWED_IMAGE_TYPES.has(mimeType)) {
    chatState.uploadStatus = 'error';
    chatState.uploadError = 'UNSUPPORTED_FILE_TYPE';
    return { ok: false, code: 'UNSUPPORTED_FILE_TYPE' };
  }
  const fileSize = Number.isFinite(file.size) ? file.size : 0;
  if (fileSize <= 0) {
    chatState.uploadStatus = 'error';
    chatState.uploadError = 'INVALID_FILE';
    return { ok: false, code: 'INVALID_FILE' };
  }
  if (fileSize > MAX_IMAGE_UPLOAD_BYTES) {
    chatState.uploadStatus = 'error';
    chatState.uploadError = 'FILE_TOO_LARGE';
    return { ok: false, code: 'FILE_TOO_LARGE' };
  }

  chatState.uploadStatus = 'uploading';
  chatState.uploadError = null;
  try {
    const out = await chatApi.uploadChatImage(file);
    const upload = out?.data?.upload;
    if (!out?.success || !upload || typeof upload.url !== 'string' || !upload.url.trim()) {
      chatState.uploadStatus = 'error';
      chatState.uploadError = 'UPLOAD_BAD_RESPONSE';
      return { ok: false, code: 'UPLOAD_BAD_RESPONSE' };
    }
    chatState.uploadStatus = 'ok';
    chatState.uploadError = null;
    return { ok: true, data: upload };
  } catch (e) {
    chatState.uploadStatus = 'error';
    chatState.uploadError = e?.code ?? 'UPLOAD_FAILED';
    return { ok: false, code: chatState.uploadError };
  }
}

export function setSearchQuery(query) {
  chatState.searchQuery = typeof query === 'string' ? query : '';
  if (!chatState.searchQuery.trim()) {
    chatState.searchStatus = 'idle';
    chatState.searchError = null;
    chatState.searchResults = [];
  }
}

export function clearSearchState() {
  chatState.searchQuery = '';
  chatState.searchStatus = 'idle';
  chatState.searchError = null;
  chatState.searchResults = [];
}

function normalizeSearchResult(raw) {
  if (!raw || typeof raw !== 'object') {
    return null;
  }
  const type = raw.type === 'message' ? 'message' : raw.type === 'chat' ? 'chat' : null;
  const chatId = typeof raw.chatId === 'string' ? raw.chatId : '';
  if (!type || !chatId) {
    return null;
  }
  const participants = Array.isArray(raw.participants)
    ? raw.participants.filter((id) => typeof id === 'string' && id.trim())
    : [];
  return {
    id:
      typeof raw.id === 'string' && raw.id.trim()
        ? raw.id
        : `${type}:${chatId}:${raw.messageId ?? ''}`,
    type,
    chatId,
    messageId: typeof raw.messageId === 'string' ? raw.messageId : null,
    title: typeof raw.title === 'string' ? raw.title : null,
    participants,
    unreadCount: Number.isFinite(raw.unreadCount) ? Math.max(0, raw.unreadCount) : 0,
    preview: typeof raw.preview === 'string' ? raw.preview : '',
    updatedAt: Number.isFinite(raw.updatedAt) ? raw.updatedAt : null,
    createdAt: Number.isFinite(raw.createdAt) ? raw.createdAt : null,
  };
}

function normalizeSearchResults(raw) {
  if (!Array.isArray(raw)) {
    return [];
  }
  const out = [];
  const seen = new Set();
  for (const item of raw) {
    const normalized = normalizeSearchResult(item);
    if (!normalized || seen.has(normalized.id)) {
      continue;
    }
    seen.add(normalized.id);
    out.push(normalized);
  }
  return out;
}

export async function searchChatDiscovery(query) {
  const q = typeof query === 'string' ? query.trim() : '';
  chatState.searchQuery = typeof query === 'string' ? query : '';
  if (!q) {
    chatState.searchStatus = 'idle';
    chatState.searchError = null;
    chatState.searchResults = [];
    return { ok: true, data: [] };
  }
  chatState.searchStatus = 'loading';
  chatState.searchError = null;
  try {
    const out = await chatApi.searchChats(q);
    if (!out?.success || !Array.isArray(out?.data?.results)) {
      chatState.searchStatus = 'error';
      chatState.searchError = 'bad_response';
      chatState.searchResults = [];
      return { ok: false, code: 'bad_response' };
    }
    const normalized = normalizeSearchResults(out.data.results);
    chatState.searchStatus = 'ok';
    chatState.searchError = null;
    chatState.searchResults = normalized;
    return { ok: true, data: normalized };
  } catch (e) {
    chatState.searchStatus = 'error';
    chatState.searchError = e?.code ?? 'search_failed';
    chatState.searchResults = [];
    return { ok: false, code: chatState.searchError };
  }
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

function normalizePendingImage(value) {
  if (!value || typeof value !== 'object') {
    return null;
  }
  const url = typeof value.url === 'string' ? value.url.trim() : '';
  if (!url) {
    return null;
  }
  return {
    url,
    name: typeof value.name === 'string' ? value.name.trim() : null,
    mimeType: typeof value.mimeType === 'string' ? value.mimeType.trim() : null,
    size: Number.isFinite(value.size) ? value.size : null,
  };
}

export async function sendActiveMessage(content, options = {}) {
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
  const image = normalizePendingImage(options?.image);
  const text = typeof content === 'string' ? content.trim() : '';
  if (!text && !image) {
    chatState.sendStatus = 'error';
    chatState.sendError = 'INVALID_PAYLOAD';
    return { ok: false, code: 'INVALID_PAYLOAD' };
  }
  const messageType = image ? 'image' : 'text';
  const outgoingContent = text || (image ? '[image]' : '');

  chatState.sendStatus = 'sending';
  chatState.sendError = null;

  const clientId = `tmp_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
  applyIncomingMessage({
    clientId,
    chatId,
    content: outgoingContent,
    messageType,
    imageUrl: image?.url ?? null,
    imageName: image?.name ?? null,
    imageMimeType: image?.mimeType ?? null,
    imageSize: image?.size ?? null,
    createdAt: Date.now(),
    state: 'PENDING',
  });

  try {
    const res = await chatApi.sendMessageToChat(chatId, outgoingContent, clientId, { image });
    if (res?.success === false) {
      throw { code: res.code ?? 'SEND_FAILED' };
    }
    chatState.sendStatus = 'ok';
    chatState.sendError = null;
    if (image) {
      chatState.uploadStatus = 'idle';
      chatState.uploadError = null;
    }
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
      content: outgoingContent,
      messageType,
      imageUrl: image?.url ?? null,
      imageName: image?.name ?? null,
      imageMimeType: image?.mimeType ?? null,
      imageSize: image?.size ?? null,
      state: 'ERROR',
    });
    return { ok: false, code: chatState.sendError };
  }
}
