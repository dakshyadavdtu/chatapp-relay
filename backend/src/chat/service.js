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
  const listAllMessagesForChat = async (chatId) => {
    if (typeof storage.messages.listAllByChatId === 'function') {
      return storage.messages.listAllByChatId(chatId);
    }
    return storage.messages.listByChatId(chatId, { limit: 200 });
  };

  const getReadCursor = async (userId, chatId) => {
    if (typeof storage.reads?.getCursor !== 'function') {
      return null;
    }
    return storage.reads.getCursor(userId, chatId);
  };

  const setReadCursor = async (userId, chatId, cursor) => {
    if (typeof storage.reads?.setCursor !== 'function') {
      return null;
    }
    return storage.reads.setCursor(userId, chatId, cursor);
  };

  const unreadCountForChat = async (chat, userId) => {
    const messages = await listAllMessagesForChat(chat.id);
    const cursor = await getReadCursor(userId, chat.id);
    const lastReadAt = Number.isFinite(cursor?.lastReadAt) ? cursor.lastReadAt : 0;
    let unreadCount = 0;
    for (const row of messages) {
      const createdAt = Number.isFinite(row?.createdAt) ? row.createdAt : 0;
      if (row?.senderId !== userId && createdAt > lastReadAt) {
        unreadCount += 1;
      }
    }
    return unreadCount;
  };

  const unreadMapForChats = async (rows, userId) => {
    if (typeof storage.reads?.bulkGetByUser !== 'function') {
      const out = Object.create(null);
      for (const chat of rows) {
        out[chat.id] = await unreadCountForChat(chat, userId);
      }
      return out;
    }
    const cursors = await storage.reads.bulkGetByUser(userId, rows.map((chat) => chat.id));
    const out = Object.create(null);
    for (const chat of rows) {
      const messages = await listAllMessagesForChat(chat.id);
      const cursor = cursors?.[chat.id] ?? null;
      const lastReadAt = Number.isFinite(cursor?.lastReadAt) ? cursor.lastReadAt : 0;
      let unreadCount = 0;
      for (const row of messages) {
        const createdAt = Number.isFinite(row?.createdAt) ? row.createdAt : 0;
        if (row?.senderId !== userId && createdAt > lastReadAt) {
          unreadCount += 1;
        }
      }
      out[chat.id] = unreadCount;
    }
    return out;
  };

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
        recipientId,
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
    async sendMessageToChat(userId, chatId, payload) {
      const content = typeof payload?.content === 'string' ? payload.content.trim() : '';
      const clientId = typeof payload?.clientId === 'string' ? payload.clientId.trim() : null;
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
      const chat = await storage.chats.get(chatId);
      if (!chat) {
        return { ok: false, status: 404, code: 'CHAT_NOT_FOUND', message: 'Chat not found' };
      }
      const members = Array.isArray(chat.members) ? chat.members : [];
      if (!members.includes(userId)) {
        return { ok: false, status: 403, code: 'CHAT_ACCESS_DENIED', message: 'Access denied' };
      }
      const recipientId = members.find((m) => m !== userId) ?? null;
      if (!recipientId) {
        return { ok: false, status: 400, code: 'INVALID_PAYLOAD', message: 'recipient missing' };
      }
      const created = await storage.messages.append({
        chatId,
        senderId: userId,
        body: content,
        clientId,
        recipientId,
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
      const unreadByChat = await unreadMapForChats(rows, userId);
      return chatListPayload(rows, userId, unreadByChat);
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
      const unreadCount = await unreadCountForChat(chat, userId);
      return { ok: true, data: { chat: chatRowPayload(chat, userId, unreadCount) } };
    },
    async markReadBody(userId, chatId, payload) {
      const chat = await storage.chats.get(chatId);
      if (!chat) {
        return { ok: false, status: 404, code: 'CHAT_NOT_FOUND', message: 'Chat not found' };
      }
      const members = Array.isArray(chat.members) ? chat.members : [];
      if (!members.includes(userId)) {
        return { ok: false, status: 403, code: 'CHAT_ACCESS_DENIED', message: 'Access denied' };
      }
      const list = await listAllMessagesForChat(chatId);
      const lastReadMessageId =
        typeof payload?.lastReadMessageId === 'string' ? payload.lastReadMessageId.trim() : '';
      let message = null;
      if (lastReadMessageId) {
        message = list.find((row) => row?.id === lastReadMessageId) ?? null;
        if (!message) {
          return {
            ok: false,
            status: 404,
            code: 'READ_MESSAGE_NOT_FOUND',
            message: 'lastReadMessageId not found',
          };
        }
      } else {
        message = list[list.length - 1] ?? null;
      }
      const lastReadAt = Number.isFinite(message?.createdAt) ? message.createdAt : Date.now();
      const stored = await setReadCursor(userId, chatId, {
        lastReadMessageId: message?.id ?? null,
        lastReadAt,
      });
      return {
        ok: true,
        data: {
          chatId,
          unreadCount: 0,
          lastReadMessageId: stored?.lastReadMessageId ?? message?.id ?? null,
          lastReadAt: stored?.lastReadAt ?? lastReadAt,
        },
      };
    },
    async openChatBody(userId, chatId, query) {
      const chatRes = await this.chatBody(userId, chatId);
      if (!chatRes.ok) {
        return chatRes;
      }
      const { limit, beforeTs } = parseMessageListQuery(query ?? new URLSearchParams(''));
      const messages = await storage.messages.listByChatId(chatId, {
        limit,
        beforeTs: beforeTs === null ? undefined : beforeTs,
      });
      const list = messageListPayload(messages, { limit, beforeTs });
      return {
        ok: true,
        data: {
          chat: chatRes.data.chat,
          messages: list.messages,
          meta: list.meta,
        },
      };
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
