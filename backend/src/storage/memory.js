import { toDirectChatId } from '../chat/chatId.js';
import { createMessageId } from '../chat/message.js';

function now() {
  return Date.now();
}

function normalizeChat(chat) {
  return {
    id: chat.id,
    kind: chat.kind,
    title: chat.title ?? null,
    members: Array.isArray(chat.members) ? [...chat.members] : [],
    updatedAt: chat.updatedAt ?? now(),
    lastMessage: chat.lastMessage ?? null,
  };
}

export function createMemoryStorage() {
  const chats = new Map();
  const messagesByChatId = new Map();
  const messagesById = new Map();

  function ensureChat(chat) {
    const c = normalizeChat(chat);
    chats.set(c.id, c);
    if (!messagesByChatId.has(c.id)) {
      messagesByChatId.set(c.id, []);
    }
    return c;
  }

  const seedUserId = 'u1';
  ensureChat({
    id: 'c1',
    kind: 'direct',
    title: 'Test chat',
    members: [seedUserId],
    updatedAt: now(),
  });

  return {
    ready: true,
    chats: {
      async get(chatId) {
        return chats.get(chatId) ?? null;
      },
      async ensureDirect(userIdA, userIdB) {
        const chatId = toDirectChatId(userIdA, userIdB);
        if (!chatId) {
          throw new Error('invalid chat members');
        }
        const existing = chats.get(chatId);
        if (existing) {
          return existing;
        }
        return ensureChat({
          id: chatId,
          kind: 'direct',
          title: null,
          members: [String(userIdA), String(userIdB)],
          updatedAt: now(),
        });
      },
      async listForUser(userId) {
        const out = [];
        for (const c of chats.values()) {
          if (!Array.isArray(c.members) || !c.members.includes(userId)) {
            continue;
          }
          out.push(c);
        }
        out.sort((a, b) => (b.updatedAt ?? 0) - (a.updatedAt ?? 0));
        return out;
      },
    },
    messages: {
      async append(record) {
        const chatId = record?.chatId;
        if (!chatId || typeof chatId !== 'string') {
          throw new Error('chatId required');
        }
        if (!chats.has(chatId)) {
          throw new Error('chat not found');
        }
        const message = {
          id: record.id ?? createMessageId(),
          chatId,
          senderId: record.senderId ?? 'u1',
          body: typeof record.body === 'string' ? record.body : '',
          createdAt: record.createdAt ?? now(),
        };
        messagesById.set(message.id, message);
        const list = messagesByChatId.get(chatId) ?? [];
        list.push(message);
        messagesByChatId.set(chatId, list);

        const chat = chats.get(chatId);
        if (chat) {
          chat.updatedAt = message.createdAt;
          chat.lastMessage = {
            id: message.id,
            body: message.body,
            senderId: message.senderId,
            createdAt: message.createdAt,
          };
        }
        return message;
      },
      async getById(messageId) {
        return messagesById.get(messageId) ?? null;
      },
      async listByChatId(chatId, opts) {
        const limitRaw = opts?.limit;
        const limit = Number.isFinite(limitRaw) ? Math.max(1, Math.min(200, limitRaw)) : 50;
        const beforeTsRaw = opts?.beforeTs;
        const beforeTs = Number.isFinite(beforeTsRaw) ? beforeTsRaw : null;

        const list = messagesByChatId.get(chatId) ?? [];
        let filtered = list;
        if (beforeTs !== null) {
          filtered = filtered.filter((m) => (m.createdAt ?? 0) < beforeTs);
        }
        const slice = filtered.slice(-limit);
        return slice;
      },
    },
    rooms: {
      async get(_id) {
        return null;
      },
    },
  };
}

