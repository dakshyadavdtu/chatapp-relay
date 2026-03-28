import { subscribeMessageCreated } from '../realtime/messageCreated.js';
import { createWebSocketRuntime } from './runtime.js';

export function attachWebSocket(httpServer) {
  const runtime = createWebSocketRuntime();
  subscribeMessageCreated((evt) => {
    runtime.handleMessageCreated(evt);
  });

  httpServer.on('upgrade', (req, socket, head) => {
    runtime.handleUpgrade(req, socket, head);
  });
}
