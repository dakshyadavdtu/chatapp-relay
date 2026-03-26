import { WebSocketServer } from 'ws';
import { handleConnection } from './connection.js';

export function createWebSocketRuntime() {
  const wss = new WebSocketServer({ noServer: true });
  const connections = new Map();

  wss.on('connection', (ws, req) => {
    handleConnection(ws, req, {
      onOpen(ctx) {
        connections.set(ctx.id, ctx);
      },
      onClose(ctx) {
        connections.delete(ctx.id);
      },
    });
  });

  return {
    handleUpgrade(req, socket, head) {
      wss.handleUpgrade(req, socket, head, (ws) => {
        wss.emit('connection', ws, req);
      });
    },
    handleMessageCreated(evt) {
      const payload = {
        type: 'message.created',
        message: {
          messageId: evt?.messageId ?? null,
          chatId: evt?.chatId ?? null,
          senderId: evt?.senderId ?? null,
          recipientId: evt?.recipientId ?? null,
          content: evt?.content ?? '',
          createdAt: evt?.createdAt ?? null,
        },
      };
      for (const c of connections.values()) {
        c.send(payload);
      }
    },
  };
}
