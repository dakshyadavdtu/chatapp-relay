export function rejectWebSocketUpgrade(_req, socket) {
  const body = 'websocket not implemented\n';
  const headers = [
    'HTTP/1.1 501 Not Implemented',
    'Connection: close',
    `Content-Length: ${Buffer.byteLength(body)}`,
    'Content-Type: text/plain; charset=utf-8',
    '',
    '',
  ].join('\r\n');

  socket.write(headers);
  socket.write(body);
  socket.destroy();
}

