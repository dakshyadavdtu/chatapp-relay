import { readJsonBody } from '../../body.js';
import { jsonErr, jsonOk } from '../../json.js';
import { saveImageUpload } from '../../../uploads/store.js';

const MAX_IMAGE_BYTES = 2 * 1024 * 1024;
const DATA_URL_PREFIX = /^data:([a-zA-Z0-9.+-]+\/[a-zA-Z0-9.+-]+);base64,(.+)$/;
const ALLOWED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/gif', 'image/webp']);

function decodeDataUrl(dataUrl) {
  if (typeof dataUrl !== 'string') {
    return null;
  }
  const match = DATA_URL_PREFIX.exec(dataUrl.trim());
  if (!match) {
    return null;
  }
  const mimeType = match[1];
  const base64 = match[2];
  let buffer;
  try {
    buffer = Buffer.from(base64, 'base64');
  } catch {
    return null;
  }
  if (!buffer || buffer.length === 0) {
    return null;
  }
  return { mimeType, buffer };
}

export async function handleApiUploadImage(ctx, res) {
  if (ctx.method !== 'POST') {
    jsonErr(res, 405, 'Method not allowed', 'METHOD_NOT_ALLOWED');
    return;
  }
  const ct = ctx.req.headers['content-type'] ?? '';
  if (!ct.includes('application/json')) {
    jsonErr(res, 415, 'Unsupported media type', 'UNSUPPORTED_MEDIA_TYPE');
    return;
  }

  let payload;
  try {
    payload = await readJsonBody(ctx.req, { limit: 5 * 1024 * 1024 });
  } catch (e) {
    if (e.code === 'PAYLOAD_TOO_LARGE') {
      jsonErr(res, 413, 'Payload too large', 'PAYLOAD_TOO_LARGE');
      return;
    }
    jsonErr(res, 400, 'Invalid JSON', 'INVALID_JSON');
    return;
  }

  const filename = typeof payload?.filename === 'string' ? payload.filename.trim() : '';
  const declaredType = typeof payload?.mimeType === 'string' ? payload.mimeType.trim() : '';
  const decoded = decodeDataUrl(payload?.dataUrl);
  if (!decoded) {
    jsonErr(res, 400, 'Invalid image data', 'INVALID_IMAGE_DATA');
    return;
  }
  if (!decoded.mimeType.startsWith('image/')) {
    jsonErr(res, 400, 'Only image files are supported', 'UNSUPPORTED_FILE_TYPE');
    return;
  }
  if (!ALLOWED_IMAGE_TYPES.has(decoded.mimeType)) {
    jsonErr(res, 400, 'Only jpeg, png, gif, and webp are supported', 'UNSUPPORTED_FILE_TYPE');
    return;
  }
  if (declaredType && declaredType !== decoded.mimeType) {
    jsonErr(res, 400, 'Image type mismatch', 'INVALID_IMAGE_DATA');
    return;
  }
  if (decoded.buffer.length > MAX_IMAGE_BYTES) {
    jsonErr(res, 400, 'File too large', 'FILE_TOO_LARGE');
    return;
  }

  const upload = saveImageUpload({
    mimeType: decoded.mimeType,
    buffer: decoded.buffer,
    filename,
  });
  jsonOk(res, { upload });
}
