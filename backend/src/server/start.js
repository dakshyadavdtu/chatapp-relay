import { createServer } from 'node:http';
import { loadConfig } from '../config/env.js';
import { createHttpHandler } from '../http/index.js';
import { attachWebSocket } from '../websocket/index.js';
import { ensureRootAdmin } from '../auth/users.js';

function createAppServer() {
  const server = createServer(createHttpHandler());
  attachWebSocket(server);
  return server;
}

export function startServer() {
  const { port, adminSeed } = loadConfig();
  if (adminSeed) {
    const seeded = ensureRootAdmin(adminSeed);
    if (!seeded.ok) {
      console.warn('admin seed skipped:', seeded.code);
    }
  }
  const server = createAppServer();

  server.listen(port, () => {
    console.log(`relay-backend listening on ${port}`);
  });
}

