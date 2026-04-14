import { getRoute } from '../app/router.js';
import { messageKey, sortMessagesOldestFirst } from '../features/chat/messageList.js';
import { getConnectionState, subscribeConnection } from '../transport/connectionState.js';
import {
  getActiveRecipientId,
  getMessagesState,
  chatState,
  bootstrapChatShell,
  openActiveChat,
  sendActiveMessage,
  refreshActiveChat,
  searchChatDiscovery,
  setSearchQuery,
  setActiveChatId,
  subscribeChatMessages,
} from '../features/chat/state.js';

function labelForChat(chat) {
  if (chat.title && String(chat.title).trim()) {
    return chat.title;
  }
  if (Array.isArray(chat.participants) && chat.participants.length) {
    return chat.participants.join(', ');
  }
  return chat.chatId ?? 'Chat';
}

function previewForChat(chat) {
  const text = typeof chat?.lastMessage?.content === 'string' ? chat.lastMessage.content.trim() : '';
  if (!text) {
    return '';
  }
  if (text.length <= 60) {
    return text;
  }
  return `${text.slice(0, 57)}...`;
}

function messageErrorText(code) {
  const map = {
    CHAT_NOT_FOUND: 'Chat not found.',
    CHAT_ACCESS_DENIED: 'No access to this chat.',
    bad_response: 'Bad message response.',
    fetch_failed: 'Could not load messages.',
  };
  return map[code] ?? 'Could not load messages.';
}

function sendErrorText(code) {
  const map = {
    CHAT_NOT_FOUND: 'Chat not found.',
    CHAT_ACCESS_DENIED: 'No access to this chat.',
    INVALID_PAYLOAD: 'Message text is required.',
    CONTENT_TOO_LONG: 'Message is too long.',
    NO_RECIPIENT: 'Cannot resolve chat recipient.',
    SEND_FAILED: 'Could not send message.',
  };
  return map[code] ?? 'Could not send message.';
}

function chatErrorText(code) {
  const map = {
    bad_response: 'Could not load chat.',
    fetch_failed: 'Could not load chat.',
    CHAT_NOT_FOUND: 'Chat not found.',
    CHAT_ACCESS_DENIED: 'No access to this chat.',
  };
  return map[code] ?? 'Could not load chat.';
}

function formatTime(ts) {
  if (typeof ts !== 'number') {
    return '';
  }
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) {
    return '';
  }
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

let lastMessageUnsub = null;
let lastConnectionUnsub = null;

function socketStateText(state) {
  const status = state?.status ?? 'disconnected';
  if (status === 'connected') {
    return state?.recoveredAt ? 'Socket: connected (recovered)' : 'Socket: connected';
  }
  if (status === 'connecting') {
    return 'Socket: connecting…';
  }
  if (status === 'reconnecting') {
    const attempt = Number.isFinite(state?.reconnectAttempt) ? state.reconnectAttempt : 0;
    const nextRetryMs = Number.isFinite(state?.nextRetryMs) ? state.nextRetryMs : null;
    if (nextRetryMs !== null) {
      return `Socket: reconnecting (attempt ${attempt}, retry in ${Math.ceil(nextRetryMs / 1000)}s)`;
    }
    return `Socket: reconnecting (attempt ${attempt})`;
  }
  if (status === 'reconnect_failed') {
    return 'Socket: reconnect failed';
  }
  if (status === 'auth_failed') {
    return 'Socket: auth expired, sign in again';
  }
  return 'Socket: disconnected';
}

export async function renderChatPage(container) {
  lastMessageUnsub?.();
  lastConnectionUnsub?.();
  lastMessageUnsub = null;
  lastConnectionUnsub = null;
  await bootstrapChatShell();

  const root = document.createElement('div');
  root.className = 'chat-page';

  const main = document.createElement('section');
  main.className = 'chat-main';
  const mainHint = document.createElement('p');
  mainHint.className = 'chat-empty';
  const messageWrap = document.createElement('div');
  messageWrap.className = 'chat-messages';
  const composer = document.createElement('form');
  composer.className = 'chat-composer';
  const input = document.createElement('input');
  input.className = 'chat-composer-input';
  input.type = 'text';
  input.placeholder = 'Type a message';
  const sendBtn = document.createElement('button');
  sendBtn.className = 'chat-composer-send';
  sendBtn.type = 'submit';
  sendBtn.textContent = 'Send';
  const sendHint = document.createElement('p');
  sendHint.className = 'chat-composer-hint';
  const connectionHint = document.createElement('p');
  connectionHint.className = 'chat-connection-state';
  const setConnectionHint = () => {
    connectionHint.textContent = socketStateText(getConnectionState());
  };
  setConnectionHint();
  composer.append(input, sendBtn);

  async function renderMessagesArea() {
    const chatId = chatState.activeChatId;
    mainHint.textContent = chatId ? `Chat: ${chatId}` : 'Pick a chat from the list.';
    messageWrap.replaceChildren();
    if (!chatId) {
      return;
    }
    if (chatState.activeChatStatus === 'ok' && chatState.activeChat) {
      const label = labelForChat(chatState.activeChat);
      mainHint.textContent = `Chat: ${label}`;
    }
    if (chatState.activeChatStatus === 'loading') {
      const p = document.createElement('p');
      p.className = 'chat-empty';
      p.textContent = 'Opening chat…';
      messageWrap.append(p);
      input.disabled = true;
      sendBtn.disabled = true;
      return;
    }
    if (chatState.activeChatStatus === 'error') {
      const p = document.createElement('p');
      p.className = 'chat-empty';
      p.textContent = chatErrorText(chatState.activeChatError);
      messageWrap.append(p);
      input.disabled = true;
      sendBtn.disabled = true;
      return;
    }
    const recipientId = getActiveRecipientId();
    const canSend = Boolean(recipientId);
    const sending = chatState.sendStatus === 'sending';
    input.disabled = !canSend || sending;
    sendBtn.disabled = !canSend || sending;
    if (!canSend) {
      sendHint.textContent = 'Sending is only available for direct chats.';
    } else if (sending) {
      sendHint.textContent = 'Sending…';
    } else if (chatState.sendStatus === 'error') {
      sendHint.textContent = sendErrorText(chatState.sendError);
    } else {
      sendHint.textContent = '';
    }
    const msgState = getMessagesState(chatId);
    if (msgState.status === 'idle' || msgState.status === 'loading') {
      const p = document.createElement('p');
      p.className = 'chat-empty';
      p.textContent = 'Loading messages…';
      messageWrap.append(p);
      return;
    }
    if (chatId !== chatState.activeChatId) {
      return;
    }
    if (msgState.status === 'error') {
      const p = document.createElement('p');
      p.className = 'chat-empty';
      p.textContent = messageErrorText(msgState.error);
      messageWrap.append(p);
      return;
    }
    const items = sortMessagesOldestFirst(msgState.items);
    if (items.length === 0) {
      const p = document.createElement('p');
      p.className = 'chat-empty';
      p.textContent = 'No messages yet.';
      messageWrap.append(p);
      return;
    }
    const ul = document.createElement('ul');
    ul.className = 'chat-message-list';
    for (const m of items) {
      const li = document.createElement('li');
      li.className = 'chat-message-list-item';
      const mk = messageKey(m);
      if (mk) {
        li.dataset.messageId = mk;
      }
      const who = m.senderId ?? '?';
      const text = typeof m.content === 'string' ? m.content : '';
      const at = formatTime(m.createdAt);
      li.textContent = at ? `${who} (${at}): ${text}` : `${who}: ${text}`;
      ul.append(li);
    }
    messageWrap.append(ul);
  }

  const sidebar = document.createElement('aside');
  sidebar.className = 'chat-sidebar';
  const sideTitle = document.createElement('p');
  sideTitle.className = 'chat-sidebar-title';
  sideTitle.textContent = 'Chats';

  const searchForm = document.createElement('form');
  searchForm.className = 'chat-search-form';
  const searchInput = document.createElement('input');
  searchInput.className = 'chat-search-input';
  searchInput.type = 'search';
  searchInput.placeholder = 'Search chats';
  searchInput.value = chatState.searchQuery;
  const searchBtn = document.createElement('button');
  searchBtn.className = 'chat-search-button';
  searchBtn.type = 'submit';
  searchBtn.textContent = 'Search';
  searchForm.append(searchInput, searchBtn);
  const searchHint = document.createElement('p');
  searchHint.className = 'chat-search-hint';

  const statusEl = document.createElement('p');
  statusEl.className = 'chat-list-status';

  const listEl = document.createElement('ul');
  listEl.className = 'chat-list';
  async function renderSidebar() {
    searchInput.value = chatState.searchQuery;
    if (chatState.searchStatus === 'loading') {
      searchHint.textContent = 'Searching…';
    } else if (chatState.searchStatus === 'error') {
      searchHint.textContent = 'Search failed.';
    } else {
      searchHint.textContent = '';
    }
    listEl.replaceChildren();
    if (chatState.loadStatus === 'loading') {
      statusEl.textContent = 'Loading…';
      return;
    }
    if (chatState.loadStatus === 'error') {
      const map = {
        not_available: 'Chat list not available',
        bad_response: 'Bad response from server',
        fetch_failed: 'Could not load chat list',
      };
      statusEl.textContent = map[chatState.loadError] ?? 'Could not load chat list';
      return;
    }
    if (chatState.chats.length === 0) {
      statusEl.textContent = 'No chats yet';
      return;
    }
    statusEl.textContent = '';
    for (const chat of chatState.chats) {
      const li = document.createElement('li');
      li.className = 'chat-list-item';
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'chat-list-button';
      const unread = Number.isFinite(chat?.unreadCount) ? chat.unreadCount : 0;
      btn.textContent = unread > 0 ? `${labelForChat(chat)} (${unread})` : labelForChat(chat);
      btn.dataset.chatId = chat.chatId;
      if (chatState.activeChatId === chat.chatId) {
        btn.setAttribute('aria-current', 'true');
      }
      btn.addEventListener('click', async () => {
        setActiveChatId(chat.chatId);
        input.value = '';
        sendHint.textContent = '';
        sendBtn.disabled = true;
        await renderSidebar();
        await openActiveChat(chat.chatId);
        await renderSidebar();
        await renderMessagesArea();
      });
      li.append(btn);
      const preview = previewForChat(chat);
      if (preview) {
        const previewEl = document.createElement('p');
        previewEl.className = 'chat-list-preview';
        previewEl.textContent = preview;
        li.append(previewEl);
      }
      listEl.append(li);
    }
  }
  await renderSidebar();
  searchInput.addEventListener('input', () => {
    setSearchQuery(searchInput.value);
    void renderSidebar();
  });
  searchForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    await searchChatDiscovery(searchInput.value);
    await renderSidebar();
  });

  sidebar.append(sideTitle, searchForm, searchHint, statusEl, listEl);

  composer.addEventListener('submit', async (e) => {
    e.preventDefault();
    const text = input.value.trim();
    if (!text) {
      sendHint.textContent = 'Enter a message.';
      return;
    }
    sendBtn.disabled = true;
    input.disabled = true;
    sendHint.textContent = 'Sending…';
    const out = await sendActiveMessage(text);
    if (!out.ok) {
      sendHint.textContent = sendErrorText(out.code);
      input.disabled = false;
      sendBtn.disabled = !getActiveRecipientId();
      return;
    }
    input.value = '';
    sendHint.textContent = '';
    input.disabled = false;
    sendBtn.disabled = !getActiveRecipientId();
    await refreshActiveChat();
    await renderSidebar();
    await renderMessagesArea();
  });

  main.append(mainHint, messageWrap, composer, sendHint, connectionHint);
  await renderMessagesArea();

  const onRemoteMessages = (updatedChatId) => {
    void renderSidebar();
    if (updatedChatId !== chatState.activeChatId) {
      return;
    }
    void renderMessagesArea();
  };
  lastMessageUnsub = subscribeChatMessages(onRemoteMessages);
  lastConnectionUnsub = subscribeConnection(() => {
    setConnectionHint();
  });
  const onHashLeave = () => {
    if (getRoute() !== '/chat') {
      lastMessageUnsub?.();
      lastConnectionUnsub?.();
      lastMessageUnsub = null;
      lastConnectionUnsub = null;
      window.removeEventListener('hashchange', onHashLeave);
    }
  };
  window.addEventListener('hashchange', onHashLeave);

  root.append(sidebar, main);
  container.append(root);
}
