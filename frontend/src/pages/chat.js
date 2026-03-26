import {
  getMessagesState,
  loadActiveChat,
  chatState,
  loadChats,
  loadMessages,
  setActiveChatId,
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

function messageErrorText(code) {
  const map = {
    CHAT_NOT_FOUND: 'Chat not found.',
    CHAT_ACCESS_DENIED: 'No access to this chat.',
    bad_response: 'Bad message response.',
    fetch_failed: 'Could not load messages.',
  };
  return map[code] ?? 'Could not load messages.';
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

export async function renderChatPage(container) {
  await loadChats();

  const root = document.createElement('div');
  root.className = 'chat-page';

  const main = document.createElement('section');
  main.className = 'chat-main';
  const mainHint = document.createElement('p');
  mainHint.className = 'chat-empty';
  const messageWrap = document.createElement('div');
  messageWrap.className = 'chat-messages';

  async function renderMessagesArea() {
    const chatId = chatState.activeChatId;
    mainHint.textContent = chatId ? `Chat: ${chatId}` : 'Pick a chat from the list.';
    messageWrap.replaceChildren();
    if (!chatId) {
      return;
    }
    await loadActiveChat(chatId);
    if (chatState.activeChatStatus === 'ok' && chatState.activeChat) {
      const label = labelForChat(chatState.activeChat);
      mainHint.textContent = `Chat: ${label}`;
    }
    const loading = document.createElement('p');
    loading.className = 'chat-empty';
    loading.textContent = 'Loading messages…';
    messageWrap.append(loading);
    await loadMessages(chatId);
    messageWrap.replaceChildren();
    const msgState = getMessagesState(chatId);
    if (msgState.status === 'error') {
      const p = document.createElement('p');
      p.className = 'chat-empty';
      p.textContent = messageErrorText(msgState.error);
      messageWrap.append(p);
      return;
    }
    if (msgState.items.length === 0) {
      const p = document.createElement('p');
      p.className = 'chat-empty';
      p.textContent = 'No messages yet.';
      messageWrap.append(p);
      return;
    }
    const ul = document.createElement('ul');
    ul.className = 'chat-message-list';
    for (const m of msgState.items) {
      const li = document.createElement('li');
      li.className = 'chat-message-list-item';
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

  const statusEl = document.createElement('p');
  statusEl.className = 'chat-list-status';

  const listEl = document.createElement('ul');
  listEl.className = 'chat-list';

  if (chatState.loadStatus === 'loading') {
    statusEl.textContent = 'Loading…';
  } else if (chatState.loadStatus === 'error') {
    const map = {
      not_available: 'Chat list not available',
      bad_response: 'Bad response from server',
      fetch_failed: 'Could not load chat list',
    };
    statusEl.textContent = map[chatState.loadError] ?? 'Could not load chat list';
  } else if (chatState.chats.length === 0) {
    statusEl.textContent = 'No chats yet';
  } else {
    statusEl.textContent = '';
  }

  for (const chat of chatState.chats) {
    const li = document.createElement('li');
    li.className = 'chat-list-item';
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'chat-list-button';
    btn.textContent = labelForChat(chat);
    btn.dataset.chatId = chat.chatId;
    if (chatState.activeChatId === chat.chatId) {
      btn.setAttribute('aria-current', 'true');
    }
    btn.addEventListener('click', async () => {
      setActiveChatId(chat.chatId);
      listEl.querySelectorAll('.chat-list-button').forEach((b) => b.removeAttribute('aria-current'));
      btn.setAttribute('aria-current', 'true');
      await renderMessagesArea();
    });
    li.append(btn);
    listEl.append(li);
  }

  sidebar.append(sideTitle, statusEl, listEl);

  main.append(mainHint, messageWrap);
  await renderMessagesArea();

  root.append(sidebar, main);
  container.append(root);
}
