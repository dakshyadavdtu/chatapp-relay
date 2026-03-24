import { listChats } from '../api/chat.js';

export async function renderChatPage(container) {
  const root = document.createElement('div');
  root.className = 'chat-page';

  const sidebar = document.createElement('aside');
  sidebar.className = 'chat-sidebar';
  const sideTitle = document.createElement('p');
  sideTitle.className = 'chat-sidebar-title';
  sideTitle.textContent = 'Chats';
  const sideBody = document.createElement('p');
  sideBody.className = 'chat-empty';

  let sideText = 'None yet';
  try {
    const r = await listChats();
    if (r?.reason === 'not_available') {
      sideText = 'List not available on server yet';
    } else if (r?.success && Array.isArray(r?.data)) {
      sideText = r.data.length === 0 ? 'None yet' : `${r.data.length} chats`;
    }
  } catch {
    sideText = 'Could not load chat list';
  }
  sideBody.textContent = sideText;

  sidebar.append(sideTitle, sideBody);

  const main = document.createElement('section');
  main.className = 'chat-main';
  const mainHint = document.createElement('p');
  mainHint.className = 'chat-empty';
  mainHint.textContent = 'Pick a chat when the API is ready.';
  main.append(mainHint);

  root.append(sidebar, main);
  container.append(root);
}
