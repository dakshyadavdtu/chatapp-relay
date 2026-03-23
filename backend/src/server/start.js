import { createServer } from 'node:http';
import { loadConfig } from '../config/env.js';
import { createHttpHandler } from '../http/index.js';
import { attachWebSocket } from '../websocket/index.js';

function createAppServer() {
  const server = createServer(createHttpHandler());
  attachWebSocket(server);
  return server;
}

export function startServer() {
  const { port } = loadConfig();
  const server = createAppServer();

  server.listen(port, () => {
    console.log(`relay-backend listening on ${port}`);
  });
}

