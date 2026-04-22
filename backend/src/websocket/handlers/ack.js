import { MessageType } from '../protocol.js';
import { getConnectionsForUser } from '../connections.js';
import { getStorage } from '../../storage/index.js';

async function lookupMessageForRecipient(messageId, userId) {
  if (!messageId) return { ok: false, code: 'INVALID_PAYLOAD' };
  const storage = getStorage();
  const message = await storage.messages.getById(messageId);
  if (!message) return { ok: false, code: 'MESSAGE_NOT_FOUND' };
  if (message.recipientId !== userId) {
    return { ok: false, code: 'NOT_AUTHORIZED' };
  }
  return { ok: true, message };
}

function emitError(ctx, code, messageId) {
  ctx.send({
    type: MessageType.MESSAGE_ERROR,
    code,
    messageId: messageId ?? null,
    ts: Date.now(),
  });
}

function emitStateUpdate(ctx, message, state) {
  ctx.send({
    type: MessageType.MESSAGE_STATE_UPDATE,
    messageId: message.id,
    chatId: message.chatId,
    state,
    ts: Date.now(),
  });
}

async function broadcastAck(ctx, parsed, state) {
  if (!ctx?.userId) return;
  const messageId = typeof parsed?.messageId === 'string' ? parsed.messageId : '';
  const lookup = await lookupMessageForRecipient(messageId, ctx.userId);
  if (!lookup.ok) {
    emitError(ctx, lookup.code, messageId);
    return;
  }
  const { message } = lookup;
  const senderId = message.senderId;
  const payload = {
    type: MessageType.MESSAGE_STATE_UPDATE,
    messageId: message.id,
    chatId: message.chatId,
    recipientId: ctx.userId,
    senderId,
    state,
    ts: Date.now(),
  };
  for (const peer of getConnectionsForUser(senderId)) {
    peer.send(payload);
  }
  emitStateUpdate(ctx, message, state);
}

export function handleMessageRead(_ws, parsed, ctx) {
  void broadcastAck(ctx, parsed, 'READ');
}

export function handleMessageDelivered(_ws, parsed, ctx) {
  void broadcastAck(ctx, parsed, 'DELIVERED');
}
