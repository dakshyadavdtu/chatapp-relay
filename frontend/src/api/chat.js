import { apiUrl } from '../config/api.js';
import { getJson } from './client.js';

export async function listChats() {
  try {
    return await getJson('/api/chats');
  } catch (e) {
    if (e?.status === 404) {
      return { success: false, code: 'NOT_AVAILABLE' };
    }
    throw e;
  }
}

export async function listMessages(chatId) {
  const path = `/api/chats/${encodeURIComponent(chatId)}/messages`;
  return getJson(path);
}

export async function getChat(chatId) {
  const path = `/api/chats/${encodeURIComponent(chatId)}`;
  return getJson(path);
}
