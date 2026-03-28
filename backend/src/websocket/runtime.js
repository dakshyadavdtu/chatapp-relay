import { WebSocketServer } from 'ws';
import { handleConnection } from './connection.js';
import { broadcastToAll, buildMessageCreatedPayload } from './outbound.js';

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
      broadcastToAll(connections, buildMessageCreatedPayload(evt));
    },
  };
}
