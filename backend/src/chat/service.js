import { getStorage } from '../storage/index.js';
import { emitMessageCreated } from '../realtime/bus.js';
import { toDirectChatId } from './chatId.js';
import { chatListPayload, chatRowPayload } from './listPayload.js';
import { messageListPayload, parseMessageListQuery } from './messageListPayload.js';

const MAX_MESSAGE_CONTENT_LENGTH = 2000;

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
    async sendMessageBody(userId, payload) {
      const recipientId = typeof payload?.recipientId === 'string' ? payload.recipientId.trim() : '';
      const content = typeof payload?.content === 'string' ? payload.content.trim() : '';
      const clientId = typeof payload?.clientId === 'string' ? payload.clientId.trim() : null;
      if (!recipientId) {
        return { ok: false, status: 400, code: 'INVALID_PAYLOAD', message: 'recipientId required' };
      }
      if (!content) {
        return { ok: false, status: 400, code: 'INVALID_PAYLOAD', message: 'content required' };
      }
      if (content.length > MAX_MESSAGE_CONTENT_LENGTH) {
        return {
          ok: false,
          status: 400,
          code: 'CONTENT_TOO_LONG',
          message: `content exceeds ${MAX_MESSAGE_CONTENT_LENGTH}`,
        };
      }
      const senderId = String(userId);
      if (senderId === recipientId) {
        return { ok: false, status: 400, code: 'INVALID_PAYLOAD', message: 'Cannot send to self' };
      }

      let chat;
      if (typeof storage.chats.ensureDirect === 'function') {
        chat = await storage.chats.ensureDirect(senderId, recipientId);
      } else {
        const fallbackId = toDirectChatId(senderId, recipientId);
        chat = await storage.chats.get(fallbackId);
      }
      if (!chat?.id) {
        return { ok: false, status: 500, code: 'CHAT_ERROR', message: 'Cannot resolve chat' };
      }

      const created = await storage.messages.append({
        chatId: chat.id,
        senderId,
        body: content,
        clientId,
      });
      emitMessageCreated({
        messageId: created.id,
        chatId: created.chatId,
        senderId: created.senderId,
        recipientId,
        content: created.body,
        createdAt: created.createdAt,
        clientId,
      });
      return {
        ok: true,
        status: 201,
        data: {
          message: {
            id: created.id,
            messageId: created.id,
            chatId: created.chatId,
            senderId: created.senderId,
            recipientId,
            content: created.body,
            createdAt: created.createdAt,
            clientId,
            state: 'SENT',
          },
        },
      };
    },
    async chatListBody(userId) {
      const rows = await storage.chats.listForUser(userId);
      return chatListPayload(rows, userId);
    },
    async chatBody(userId, chatId) {
      const chat = await storage.chats.get(chatId);
      if (!chat) {
        return { ok: false, status: 404, code: 'CHAT_NOT_FOUND', message: 'Chat not found' };
      }
      const members = Array.isArray(chat.members) ? chat.members : [];
      if (!members.includes(userId)) {
        return { ok: false, status: 403, code: 'CHAT_ACCESS_DENIED', message: 'Access denied' };
      }
      return { ok: true, data: { chat: chatRowPayload(chat, userId) } };
    },
    async messageListBody(userId, chatId, query) {
      const open = await this.chatBody(userId, chatId);
      if (!open.ok) {
        return open;
      }
      const { limit, beforeTs } = parseMessageListQuery(query);
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

let svc;

export function getChatService() {
  if (!svc) {
    svc = createChatService(getStorage());
  }
  return svc;
}
