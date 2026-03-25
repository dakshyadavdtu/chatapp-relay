import { listChats, listMessages } from '../../api/chat.js';

export const chatState = {
  activeChatId: null,
  chats: [],
  loadStatus: 'idle',
  loadError: null,
  activeMessages: [],
  messagesMeta: null,
  messagesStatus: 'idle',
  messagesError: null,
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

export async function loadMessages(chatId) {
  if (!chatId) {
    chatState.activeMessages = [];
    chatState.messagesMeta = null;
    chatState.messagesStatus = 'idle';
    chatState.messagesError = null;
    return;
  }
  chatState.messagesStatus = 'loading';
  chatState.messagesError = null;
  try {
    const r = await listMessages(chatId);
    if (!r?.success || !Array.isArray(r?.data?.messages)) {
      chatState.activeMessages = [];
      chatState.messagesMeta = null;
      chatState.messagesStatus = 'error';
      chatState.messagesError = 'bad_response';
      return;
    }
    chatState.activeMessages = r.data.messages;
    chatState.messagesMeta = r.data.meta ?? null;
    chatState.messagesStatus = 'ok';
  } catch (e) {
    chatState.activeMessages = [];
    chatState.messagesMeta = null;
    chatState.messagesStatus = 'error';
    chatState.messagesError = e?.code ?? 'fetch_failed';
  }
}
