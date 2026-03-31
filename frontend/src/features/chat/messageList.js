export function messageKey(m) {
  if (!m || typeof m !== 'object') {
    return '';
  }
  const k = m.id ?? m.messageId ?? m.clientId ?? m.clientMessageId;
  return k != null && k !== '' ? String(k) : '';
}

export function normalizeChatMessage(raw, chatId) {
  const id = messageKey(raw);
  if (!id) {
    return null;
  }
  const cid = raw.chatId ?? chatId ?? null;
  let createdAt = raw.createdAt ?? raw.timestamp;
  if (typeof createdAt !== 'number' || Number.isNaN(createdAt)) {
    createdAt = null;
  }
  return {
    id,
    messageId: raw.messageId ?? id,
    clientId: raw.clientId ?? raw.clientMessageId ?? null,
    chatId: cid,
    senderId: raw.senderId ?? null,
    recipientId: raw.recipientId ?? null,
    content: typeof raw.content === 'string' ? raw.content : '',
    createdAt,
    state: raw.state ?? null,
  };
}

export function sortMessagesOldestFirst(items) {
  return [...items].sort((a, b) => {
    const ta = a.createdAt ?? 0;
    const tb = b.createdAt ?? 0;
    if (ta !== tb) {
      return ta - tb;
    }
    return String(a.id).localeCompare(String(b.id));
  });
}

export function normalizeMessageListForChat(rawList, chatId) {
  if (!Array.isArray(rawList)) {
    return [];
  }
  const seen = new Set();
  const out = [];
  for (const raw of rawList) {
    const n = normalizeChatMessage(raw, chatId);
    if (!n) {
      continue;
    }
    if (seen.has(n.id)) {
      continue;
    }
    seen.add(n.id);
    out.push(n);
  }
  return sortMessagesOldestFirst(out);
}
