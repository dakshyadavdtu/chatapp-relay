import { jsonErr, jsonOk } from '../../json.js';
import { getSession } from '../../../auth/session.js';
import { createStorage } from '../../../storage/index.js';
import { createChatService } from '../../../chat/service.js';

export async function handleApiChatsList(ctx, res) {
  if (ctx.method !== 'GET' && ctx.method !== 'HEAD') {
    jsonErr(res, 405, 'Method not allowed', 'METHOD_NOT_ALLOWED');
    return;
  }
  if (ctx.method === 'HEAD') {
    res.writeHead(204, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end();
    return;
  }

  const session = await getSession(ctx.req);
  const userId = session?.user?.id ?? 'u1';

  const storage = createStorage();
  const chat = createChatService(storage);
  const chats = await chat.listChatsForUser(userId);

  jsonOk(
    res,
    chats.map((c) => ({
      id: c.id,
      kind: c.kind,
      title: c.title ?? null,
      updatedAt: c.updatedAt ?? null,
      lastMessage: c.lastMessage ?? null,
    }))
  );
}

