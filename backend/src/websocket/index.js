import { createWebSocketRuntime } from './runtime.js';
import { setOnMessageCreated } from '../chat/hooks.js';

export function attachWebSocket(httpServer) {
  const runtime = createWebSocketRuntime();
  setOnMessageCreated((evt) => {
    runtime.handleMessageCreated(evt);
  });

  httpServer.on('upgrade', (req, socket, head) => {
    runtime.handleUpgrade(req, socket, head);
  });
}
