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
    // Call this once you know who connected (e.g. after session resolves)
    setConnectionUser(ctx, userId) {
      ctx.userId = userId;
      registerUserConnection(userId, ctx);
    },
    handleMessageCreated(evt) {
      const payload = buildMessageCreatedPayload(evt);
      const recipientId = evt?.recipientId ?? null;
      const senderId = evt?.senderId ?? null;

      // Deliver to recipient if they have active connections
      let delivered = false;
      if (recipientId) {
        const recipientConns = getConnectionsForUser(recipientId);
        for (const ctx of recipientConns) {
          ctx.send(payload);
          delivered = true;
        }
      }
      // Also deliver to sender (other tabs / echo)
      if (senderId && senderId !== recipientId) {
        for (const ctx of getConnectionsForUser(senderId)) {
          ctx.send(payload);
          delivered = true;
        }
      }
      // Fall back to broadcast when no user context is tracked yet
      if (!delivered) {
        for (const ctx of connections.values()) {
          ctx.send(payload);
        }
      }
    },
  };
}
