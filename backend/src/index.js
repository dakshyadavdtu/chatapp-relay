import { createServer } from 'node:http';
import { loadConfig } from './config/env.js';
import { createHttpHandler } from './routes/http.js';
import { attachWebSocket } from './websocket/index.js';

const { port } = loadConfig();
const server = createServer(createHttpHandler());

attachWebSocket(server);

server.listen(port, () => {
  console.log(`relay-backend listening on ${port}`);
});
