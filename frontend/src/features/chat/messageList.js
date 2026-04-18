export function messageKey(m) {
  if (!m || typeof m !== 'object') {
    return '';
  }
  const k = m.id ?? m.messageId ?? m.clientId ?? m.clientMessageId;
  return k != null && k !== '' ? String(k) : '';
}

function stateRank(state) {
  const order = {
    ERROR: 0,
    PENDING: 1,
    SENT: 2,
    DELIVERED: 3,
    READ: 4,
  };
  const key = typeof state === 'string' ? state.toUpperCase() : '';
  return order[key] ?? -1;
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
    messageType: raw.messageType === 'image' ? 'image' : 'text',
    imageUrl: typeof raw.imageUrl === 'string' ? raw.imageUrl : null,
    imageName: typeof raw.imageName === 'string' ? raw.imageName : null,
    imageMimeType: typeof raw.imageMimeType === 'string' ? raw.imageMimeType : null,
    imageSize: Number.isFinite(raw.imageSize) ? raw.imageSize : null,
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

export function findMessageIndex(items, row) {
  return items.findIndex((m) => {
    if (m.id && row.id && String(m.id) === String(row.id)) return true;
    if (m.messageId && row.messageId && String(m.messageId) === String(row.messageId)) return true;
    if (m.clientId && row.clientId && String(m.clientId) === String(row.clientId)) return true;
    return messageKey(m) === messageKey(row);
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
    const existIdx = findMessageIndex(out, row);

    if (existIdx >= 0) {
      const existing = out[existIdx];
      const merged = { ...existing, ...row };
      if (existing.clientId && !row.clientId) {
        merged.clientId = existing.clientId;
      }
      if (existing.imageUrl && !row.imageUrl) {
        merged.imageUrl = existing.imageUrl;
      }
      if (existing.imageName && !row.imageName) {
        merged.imageName = existing.imageName;
      }
      if (existing.imageMimeType && !row.imageMimeType) {
        merged.imageMimeType = existing.imageMimeType;
      }
      if (existing.messageType === 'image' && row.messageType !== 'image') {
        merged.messageType = 'image';
      }
      if (typeof existing.content === 'string' && existing.content && !merged.content) {
        merged.content = existing.content;
      }
      if (stateRank(existing.state) > stateRank(merged.state)) {
        merged.state = existing.state;
      }
      const prevCreated = Number.isFinite(existing.createdAt) ? existing.createdAt : null;
      const nextCreated = Number.isFinite(merged.createdAt) ? merged.createdAt : null;
      if (prevCreated !== null && (nextCreated === null || nextCreated < prevCreated)) {
        merged.createdAt = prevCreated;
      }
      out[existIdx] = merged;
    } else {
      out.push(row);
    }
  }
  return sortMessagesOldestFirst(out);
}
