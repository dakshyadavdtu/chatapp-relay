import { getStorage } from '../storage/index.js';
import { chatListPayload } from './listPayload.js';
import { messageListPayload, parseMessageListQuery } from './messageListPayload.js';

export function createChatService(storage) {
  if (!storage || typeof storage !== 'object') {
    throw new Error('storage required');
  }
  return {
    async listChatsForUser(userId) {
      return storage.chats.listForUser(userId);
    },
    async getChat(chatId) {
      return storage.chats.get(chatId);
    },
    async listMessages(chatId, opts) {
      return storage.messages.listByChatId(chatId, opts);
    },
    async appendMessage(record) {
      return storage.messages.append(record);
    },
    async getMessage(messageId) {
      return storage.messages.getById(messageId);
    },
    async chatListBody(userId) {
      const rows = await storage.chats.listForUser(userId);
      return chatListPayload(rows, userId);
    },
    async messageListBody(userId, chatId, query) {
      const { limit, beforeTs } = parseMessageListQuery(query);
      const chatRow = await storage.chats.get(chatId);
      if (!chatRow) {
        return { ok: false, status: 404, code: 'CHAT_NOT_FOUND', message: 'Chat not found' };
      }
      const members = Array.isArray(chatRow.members) ? chatRow.members : [];
      if (!members.includes(userId)) {
        return { ok: false, status: 403, code: 'CHAT_ACCESS_DENIED', message: 'Access denied' };
      }
      const messages = await storage.messages.listByChatId(chatId, {
        limit,
        beforeTs: beforeTs === null ? undefined : beforeTs,
      });
      return {
        ok: true,
        data: messageListPayload(messages, { limit, beforeTs }),
      };
    },
  };
}

let shared;

export function getChatService() {
  if (!shared) {
    shared = createChatService(getStorage());
  }
  return shared;
}
