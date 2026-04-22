import { jsonErr, jsonOk } from '../../json.js';
import { getStorage } from '../../../storage/index.js';
import { requireAdmin } from './requireAdmin.js';

export async function handleAdminMessageDelete(ctx, res) {
  if (ctx.method !== 'POST' && ctx.method !== 'DELETE') {
    jsonErr(res, 405, 'Method not allowed', 'METHOD_NOT_ALLOWED');
    return;
  }
  const admin = await requireAdmin(ctx, res);
  if (!admin) return;

  const messageId = ctx.params?.messageId;
  if (!messageId) {
    jsonErr(res, 400, 'messageId required', 'BAD_REQUEST');
    return;
  }

  const storage = getStorage();
  if (typeof storage.messages.softDelete !== 'function') {
    jsonErr(res, 500, 'Soft delete not supported', 'NOT_SUPPORTED');
    return;
  }

  const updated = await storage.messages.softDelete(messageId);
  if (!updated) {
    jsonErr(res, 404, 'Message not found', 'MESSAGE_NOT_FOUND');
    return;
  }

  jsonOk(res, {
    message: {
      id: updated.id,
      chatId: updated.chatId,
      deletedAt: updated.deletedAt,
    },
  });
}
