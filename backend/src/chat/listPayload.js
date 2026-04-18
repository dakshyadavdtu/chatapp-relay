export function chatListPayload(chats, userId, unreadByChat = Object.create(null)) {
  return {
    chats: chats.map((c) => chatRowPayload(c, userId, unreadByChat[c.id] ?? 0)),
  };
}

export function chatRowPayload(chat, userId, unreadCount = 0) {
  return {
    chatId: chat.id,
    type: chat.kind,
    title: chat.title ?? null,
    participants: (Array.isArray(chat.members) ? chat.members : []).filter((id) => id !== userId),
    unreadCount: Number.isFinite(unreadCount) ? Math.max(0, unreadCount) : 0,
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
    messageType: raw.messageType === 'image' ? 'image' : 'text',
    imageUrl: typeof raw.imageUrl === 'string' ? raw.imageUrl : null,
    createdAt: raw.createdAt ?? null,
  };
}
