export function parseMessageListQuery(query) {
  const limitStr = query.get('limit');
  const beforeStr = query.get('beforeTs');
  const limitParsed = limitStr === null || limitStr === '' ? NaN : Number(limitStr);
  const beforeParsed = beforeStr === null || beforeStr === '' ? NaN : Number(beforeStr);
  const limit = Number.isFinite(limitParsed) ? Math.max(1, Math.min(200, limitParsed)) : 50;
  const beforeTs = Number.isFinite(beforeParsed) ? beforeParsed : null;
  return { limit, beforeTs };
}

export function messageListPayload(messages, { limit, beforeTs }) {
  return {
    messages: messages.map(toMessageWire),
    meta: {
      limit,
      beforeTs,
      count: messages.length,
    },
  };
}

function toMessageWire(m) {
  const createdAtRaw = m.createdAt ?? m.timestamp ?? null;
  const createdAt = Number.isFinite(createdAtRaw) ? createdAtRaw : null;
  return {
    id: m.id,
    messageId: m.id,
    chatId: m.chatId,
    senderId: m.senderId,
    recipientId: m.recipientId ?? null,
    content: typeof m.body === 'string' ? m.body : '',
    messageType: m.messageType === 'image' ? 'image' : 'text',
    imageUrl: typeof m.imageUrl === 'string' ? m.imageUrl : null,
    imageName: typeof m.imageName === 'string' ? m.imageName : null,
    imageMimeType: typeof m.imageMimeType === 'string' ? m.imageMimeType : null,
    imageSize: Number.isFinite(m.imageSize) ? m.imageSize : null,
    image:
      typeof m.imageUrl === 'string'
        ? {
            url: m.imageUrl,
            name: typeof m.imageName === 'string' ? m.imageName : null,
            mimeType: typeof m.imageMimeType === 'string' ? m.imageMimeType : null,
            size: Number.isFinite(m.imageSize) ? m.imageSize : null,
          }
        : null,
    createdAt,
    clientId: m.clientId ?? null,
    state: m.state ?? 'SENT',
  };
}
