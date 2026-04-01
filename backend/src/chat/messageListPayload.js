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
  return {
    id: m.id,
    messageId: m.id,
    chatId: m.chatId,
    senderId: m.senderId,
    content: typeof m.body === 'string' ? m.body : '',
    createdAt: m.createdAt ?? null,
    clientId: m.clientId ?? null,
    state: 'CONFIRMED',
  };
}
