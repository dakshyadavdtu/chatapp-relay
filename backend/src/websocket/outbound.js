export function buildMessageCreatedPayload(evt) {
  const mid = evt?.messageId ?? null;
  const clientId = evt?.clientId ?? null;
  const messageType = evt?.messageType === 'image' ? 'image' : 'text';
  return {
    type: 'MESSAGE_RECEIVE',
    messageId: mid,
    clientId,
    chatId: evt?.chatId ?? null,
    senderId: evt?.senderId ?? null,
    recipientId: evt?.recipientId ?? null,
    content: evt?.content ?? '',
    messageType,
    imageUrl: evt?.imageUrl ?? null,
    imageName: evt?.imageName ?? null,
    imageMimeType: evt?.imageMimeType ?? null,
    imageSize: Number.isFinite(evt?.imageSize) ? evt.imageSize : null,
    image: evt?.imageUrl
      ? {
          url: evt.imageUrl,
          name: evt?.imageName ?? null,
          mimeType: evt?.imageMimeType ?? null,
          size: Number.isFinite(evt?.imageSize) ? evt.imageSize : null,
        }
      : null,
    createdAt: evt?.createdAt ?? Date.now(),
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
      messageType,
      imageUrl: evt?.imageUrl ?? null,
      imageName: evt?.imageName ?? null,
      imageMimeType: evt?.imageMimeType ?? null,
      imageSize: Number.isFinite(evt?.imageSize) ? evt.imageSize : null,
      image: evt?.imageUrl
        ? {
            url: evt.imageUrl,
            name: evt?.imageName ?? null,
            mimeType: evt?.imageMimeType ?? null,
            size: Number.isFinite(evt?.imageSize) ? evt.imageSize : null,
          }
        : null,
      createdAt: evt?.createdAt ?? Date.now(),
      state: 'SENT',
    },
  };
}
