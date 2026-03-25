export function chatListPayload(chats, userId) {
  return {
    chats: chats.map((c) => ({
      chatId: c.id,
      type: c.kind,
      title: c.title ?? null,
      participants: (Array.isArray(c.members) ? c.members : []).filter((id) => id !== userId),
      unreadCount: 0,
      updatedAt: c.updatedAt ?? null,
      lastMessage: normalizeLastMessage(c.lastMessage),
    })),
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
