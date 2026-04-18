import { randomUUID } from 'node:crypto';

const uploadsById = new Map();

function normalizeFilename(value) {
  if (typeof value !== 'string') {
    return '';
  }
  return value.trim().replace(/[^a-zA-Z0-9._-]+/g, '_');
}

export function saveImageUpload({ mimeType, buffer, filename }) {
  const id = `img_${randomUUID()}`;
  const stored = {
    id,
    mimeType: typeof mimeType === 'string' ? mimeType : 'application/octet-stream',
    buffer,
    filename: normalizeFilename(filename) || `${id}.bin`,
    size: Number.isFinite(buffer?.length) ? buffer.length : 0,
    createdAt: Date.now(),
  };
  uploadsById.set(id, stored);
  return {
    id: stored.id,
    url: `/uploads/${stored.id}`,
    mimeType: stored.mimeType,
    filename: stored.filename,
    size: stored.size,
    createdAt: stored.createdAt,
  };
}

export function getImageUpload(id) {
  if (!id || typeof id !== 'string') {
    return null;
  }
  return uploadsById.get(id) ?? null;
}
