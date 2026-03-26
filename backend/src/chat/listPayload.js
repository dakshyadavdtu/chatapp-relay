export function chatListPayload(chats, userId) {
  return {
    chats: chats.map((c) => chatRowPayload(c, userId)),
  };
}

export function chatRowPayload(chat, userId) {
  return {
    chatId: chat.id,
    type: chat.kind,
    title: chat.title ?? null,
    participants: (Array.isArray(chat.members) ? chat.members : []).filter((id) => id !== userId),
    unreadCount: 0,
    updatedAt: chat.updatedAt ?? null,
    lastMessage: normalizeLastMessage(chat.lastMessage),
  };
}

function normalizeLastMessage(raw) {
  if (!raw || typeof raw !== 'object') {
    return null;
  }
  const body = typeof raw.body === 'string' ? raw.body : '';
  return {
    id: raw.id ?? null,
    senderId: raw.senderId ?? null,
    content: body,
    createdAt: raw.createdAt ?? null,
  };
}
