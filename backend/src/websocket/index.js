import { createWebSocketRuntime } from './runtime.js';

export function attachWebSocket(httpServer) {
  const runtime = createWebSocketRuntime();

  httpServer.on('upgrade', (req, socket) => {
    runtime.handleUpgrade(req, socket);
  });
}
