export function buildMessageCreatedPayload(evt) {
  const mid = evt?.messageId ?? null;
  return {
    type: 'message.created',
    v: 1,
    message: {
      id: mid,
      messageId: mid,
      chatId: evt?.chatId ?? null,
      senderId: evt?.senderId ?? null,
      recipientId: evt?.recipientId ?? null,
      content: evt?.content ?? '',
      createdAt: evt?.createdAt ?? null,
    },
  };
}

export function broadcastToAll(connections, payload) {
  for (const ctx of connections.values()) {
    if (ctx && typeof ctx.send === 'function') {
      ctx.send(payload);
    }
  }
}
