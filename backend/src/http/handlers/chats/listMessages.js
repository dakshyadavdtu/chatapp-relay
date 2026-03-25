import { jsonErr, jsonOk } from '../../json.js';
import { createStorage } from '../../../storage/index.js';
import { createChatService } from '../../../chat/service.js';

export async function handleApiChatMessagesList(ctx, res) {
  if (ctx.method !== 'GET' && ctx.method !== 'HEAD') {
    jsonErr(res, 405, 'Method not allowed', 'METHOD_NOT_ALLOWED');
    return;
  }
  if (ctx.method === 'HEAD') {
    res.writeHead(204, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end();
    return;
  }

  const chatId = ctx.params?.chatId;
  if (!chatId || typeof chatId !== 'string') {
    jsonErr(res, 400, 'chatId required', 'BAD_REQUEST');
    return;
  }

  const limit = Number(ctx.query.get('limit'));
  const beforeTs = Number(ctx.query.get('beforeTs'));

  const storage = createStorage();
  const chat = createChatService(storage);
  const messages = await chat.listMessages(chatId, {
    limit: Number.isFinite(limit) ? limit : undefined,
    beforeTs: Number.isFinite(beforeTs) ? beforeTs : undefined,
  });

  jsonOk(
    res,
    messages.map((m) => ({
      id: m.id,
      chatId: m.chatId,
      senderId: m.senderId,
      body: m.body,
      createdAt: m.createdAt,
    }))
  );
}

