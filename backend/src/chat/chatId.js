const DIRECT_PREFIX = 'direct:';
const ROOM_PREFIX = 'room:';

export function toDirectChatId(userId1, userId2) {
  if (!userId1 || !userId2) {
    return '';
  }
  const [a, b] = [String(userId1), String(userId2)].sort();
  return `${DIRECT_PREFIX}${a}:${b}`;
}

export function toRoomChatId(roomId) {
  if (!roomId || typeof roomId !== 'string') {
    return '';
  }
  return `${ROOM_PREFIX}${roomId.trim()}`;
}

export function isDirectChatId(chatId) {
  return typeof chatId === 'string' && chatId.startsWith(DIRECT_PREFIX);
}

export function isRoomChatId(chatId) {
  return typeof chatId === 'string' && chatId.startsWith(ROOM_PREFIX);
}
