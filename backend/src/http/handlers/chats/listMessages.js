import { jsonErr, jsonOk } from '../../json.js';
import { getSession } from '../../../auth/session.js';
import { createStorage } from '../../../storage/index.js';
import { createChatService } from '../../../chat/service.js';
import { messageListPayload, parseMessageListQuery } from '../../../chat/messageListPayload.js';

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

  const session = await getSession(ctx.req);
  const userId = session?.user?.id ?? 'u1';

  const storage = createStorage();
  const chat = createChatService(storage);

  const chatRow = await chat.getChat(chatId);
  if (!chatRow) {
    jsonErr(res, 404, 'Chat not found', 'CHAT_NOT_FOUND');
    return;
  }
  const members = Array.isArray(chatRow.members) ? chatRow.members : [];
  if (!members.includes(userId)) {
    jsonErr(res, 403, 'Access denied', 'CHAT_ACCESS_DENIED');
    return;
  }

  const { limit, beforeTs } = parseMessageListQuery(ctx.query);
  const messages = await chat.listMessages(chatId, {
    limit,
    beforeTs: beforeTs === null ? undefined : beforeTs,
  });

  jsonOk(res, messageListPayload(messages, { limit, beforeTs }));
}

