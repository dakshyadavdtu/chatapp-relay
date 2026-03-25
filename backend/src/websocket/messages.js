import { routeClientEvent } from './events.js';

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

export function dispatchIncomingMessage(ws, rawData, ctx) {
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
  routeClientEvent(ws, parsed, ctx);
}
