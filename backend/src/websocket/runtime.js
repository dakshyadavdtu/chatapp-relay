import { WebSocketServer } from 'ws';
import { handleConnection } from './connection.js';

export function createWebSocketRuntime() {
  const wss = new WebSocketServer({ noServer: true });

  wss.on('connection', (ws, req) => {
    handleConnection(ws, req);
  });

  return {
    handleUpgrade(req, socket, head) {
      wss.handleUpgrade(req, socket, head, (ws) => {
        wss.emit('connection', ws, req);
      });
    },
  };
}
