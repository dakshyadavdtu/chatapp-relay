import { chatState, loadChats, setActiveChatId } from '../features/chat/state.js';

function labelForChat(chat) {
  if (chat.title && String(chat.title).trim()) {
    return chat.title;
  }
  if (Array.isArray(chat.participants) && chat.participants.length) {
    return chat.participants.join(', ');
  }
  return chat.chatId ?? 'Chat';
}

export async function renderChatPage(container) {
  await loadChats();

  const root = document.createElement('div');
  root.className = 'chat-page';

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
      not_available: 'Chat list not available on server yet',
      bad_response: 'Unexpected response from server',
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
    btn.addEventListener('click', () => {
      setActiveChatId(chat.chatId);
      listEl.querySelectorAll('.chat-list-button').forEach((b) => b.removeAttribute('aria-current'));
      btn.setAttribute('aria-current', 'true');
      mainHint.textContent = `Open chat: ${chat.chatId}`;
    });
    li.append(btn);
    listEl.append(li);
  }

  sidebar.append(sideTitle, statusEl, listEl);

  const main = document.createElement('section');
  main.className = 'chat-main';
  const mainHint = document.createElement('p');
  mainHint.className = 'chat-empty';
  if (chatState.activeChatId) {
    mainHint.textContent = `Open chat: ${chatState.activeChatId}`;
  } else {
    mainHint.textContent = 'Pick a chat from the list.';
  }
  main.append(mainHint);

  root.append(sidebar, main);
  container.append(root);
}
