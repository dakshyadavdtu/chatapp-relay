import { WebSocketServer } from 'ws';
import { handleConnection } from './connection.js';
import { buildMessageCreatedPayload } from './outbound.js';
import { getConnectionsForUser, registerUserConnection } from './connections.js';

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
    setConnectionUser(ctx, userId) {
      ctx.userId = userId;
      registerUserConnection(userId, ctx);
    },
    handleMessageCreated(evt) {
      const payload = buildMessageCreatedPayload(evt);
      const recipientId = evt?.recipientId ?? null;
      const senderId = evt?.senderId ?? null;

      let delivered = false;
      if (recipientId) {
        const recipientConns = getConnectionsForUser(recipientId);
        for (const ctx of recipientConns) {
          ctx.send(payload);
          delivered = true;
        }
      }
      if (senderId && senderId !== recipientId) {
        for (const ctx of getConnectionsForUser(senderId)) {
          ctx.send(payload);
          delivered = true;
        }
      }
      if (!delivered) {
        for (const ctx of connections.values()) {
          ctx.send(payload);
        }
      }
    },
  };
}
