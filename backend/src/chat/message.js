function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

export function createMessageId() {
  const t = Date.now().toString(36);
  const r = Math.random().toString(36).slice(2, 10);
  return `msg_${t}_${r}`;
}

export function isValidMessageDraft(value) {
  if (!value || typeof value !== 'object') {
    return false;
  }
  if (!isNonEmptyString(value.senderId)) {
    return false;
  }
  if (!isNonEmptyString(value.recipientId)) {
    return false;
  }
  if (value.senderId === value.recipientId) {
    return false;
  }
  if (!isNonEmptyString(value.content)) {
    return false;
  }
  return true;
}
