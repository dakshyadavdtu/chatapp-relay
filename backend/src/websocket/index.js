import { onMessageCreated } from '../realtime/bus.js';
import { createWebSocketRuntime } from './runtime.js';

const WS_PATH = '/ws';

function matchesWsPath(rawUrl) {
  if (typeof rawUrl !== 'string' || rawUrl.length === 0) return false;
  const pathOnly = rawUrl.split('?')[0];
  return pathOnly === WS_PATH || pathOnly.startsWith(`${WS_PATH}/`);
}

export function attachWebSocket(httpServer) {
  const runtime = createWebSocketRuntime();
  onMessageCreated((evt) => {
    runtime.handleMessageCreated(evt);
  });

  httpServer.on('upgrade', (req, socket, head) => {
    if (!matchesWsPath(req.url)) {
      socket.write('HTTP/1.1 404 Not Found\r\n\r\n');
      socket.destroy();
      return;
    }
    runtime.handleUpgrade(req, socket, head);
  });
}
