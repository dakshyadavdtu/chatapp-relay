function rawToUtf8(rawData) {
  if (Buffer.isBuffer(rawData)) {
    return rawData.toString('utf8');
  }
  if (typeof rawData === 'string') {
    return rawData;
  }
  if (rawData instanceof ArrayBuffer) {
    return Buffer.from(rawData).toString('utf8');
  }
  if (ArrayBuffer.isView(rawData)) {
    return Buffer.from(rawData.buffer, rawData.byteOffset, rawData.byteLength).toString('utf8');
  }
  return '';
}

export function dispatchIncomingMessage(ws, rawData, _ctx) {
  const text = rawToUtf8(rawData).trim();
  if (!text) {
    return;
  }
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    return;
  }
  if (!parsed || typeof parsed !== 'object') {
    return;
  }
  if (parsed.type === 'ping') {
    ws.send(JSON.stringify({ type: 'pong', ts: Date.now() }));
  }
}
