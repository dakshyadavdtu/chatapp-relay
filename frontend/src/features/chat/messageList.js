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
    return messageKey(a).localeCompare(messageKey(b));
  });
}

export function normalizeMessageListForChat(rawList, chatId, existingItems = []) {
  if (!Array.isArray(rawList)) {
    return existingItems;
  }
  let out = [...existingItems];
  for (const raw of rawList) {
    const row = normalizeChatMessage(raw, chatId);
    if (!row) {
      continue;
    }
    const existIdx = out.findIndex((m) => {
      if (m.id && row.id && String(m.id) === String(row.id)) return true;
      if (m.messageId && row.messageId && String(m.messageId) === String(row.messageId)) return true;
      if (m.clientId && row.clientId && String(m.clientId) === String(row.clientId)) return true;
      return messageKey(m) === messageKey(row);
    });

    if (existIdx >= 0) {
      const merged = { ...out[existIdx], ...row };
      if (out[existIdx].clientId && !row.clientId) {
        merged.clientId = out[existIdx].clientId;
      }
      out[existIdx] = merged;
    } else {
      out.push(row);
    }
  }
  return sortMessagesOldestFirst(out);
}
