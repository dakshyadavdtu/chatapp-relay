import { listChats } from '../../api/chat.js';

export const chatState = {
  activeChatId: null,
  chats: [],
  loadStatus: 'idle',
  loadError: null,
};

export function setActiveChatId(chatId) {
  chatState.activeChatId = chatId;
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
    }
  } catch {
    chatState.chats = [];
    chatState.loadStatus = 'error';
    chatState.loadError = 'fetch_failed';
  }
}
