export function buildMessageCreatedPayload(evt) {
  const mid = evt?.messageId ?? null;
  const clientId = evt?.clientId ?? null;
  return {
    type: 'MESSAGE_RECEIVE',
    messageId: mid,
    clientId,
    chatId: evt?.chatId ?? null,
    senderId: evt?.senderId ?? null,
    recipientId: evt?.recipientId ?? null,
    content: evt?.content ?? '',
    timestamp: evt?.createdAt ?? Date.now(),
    state: 'SENT',
    message: {
      id: mid,
      messageId: mid,
      clientId,
      chatId: evt?.chatId ?? null,
      senderId: evt?.senderId ?? null,
      recipientId: evt?.recipientId ?? null,
      content: evt?.content ?? '',
      createdAt: evt?.createdAt ?? Date.now(),
      state: 'SENT',
    },
  };
}


