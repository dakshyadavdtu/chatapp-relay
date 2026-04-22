import { MessageType } from '../protocol.js';
import { getConnectionsForUser } from '../connections.js';
import { getStorage } from '../../storage/index.js';

async function broadcastTyping(ctx, chatId, type) {
  if (!ctx?.userId || typeof chatId !== 'string' || !chatId) return;
  const storage = getStorage();
  const chat = await storage.chats.get(chatId);
  if (!chat || !Array.isArray(chat.members) || !chat.members.includes(ctx.userId)) {
    return;
  }
  const payload = {
    type,
    chatId,
    userId: ctx.userId,
    ts: Date.now(),
  };
  for (const memberId of chat.members) {
    if (memberId === ctx.userId) continue;
    for (const peer of getConnectionsForUser(memberId)) {
      peer.send(payload);
    }
  }
}

export function handleTypingStart(_ws, parsed, ctx) {
  void broadcastTyping(ctx, parsed?.chatId, MessageType.TYPING_START);
}

export function handleTypingStop(_ws, parsed, ctx) {
  void broadcastTyping(ctx, parsed?.chatId, MessageType.TYPING_STOP);
}
