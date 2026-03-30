import { onMessageCreated } from '../realtime/bus.js';
import { createWebSocketRuntime } from './runtime.js';

export function attachWebSocket(httpServer) {
  const runtime = createWebSocketRuntime();
  onMessageCreated((evt) => {
    runtime.handleMessageCreated(evt);
  });

  httpServer.on('upgrade', (req, socket, head) => {
    runtime.handleUpgrade(req, socket, head);
  });
}
