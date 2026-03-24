const DEFAULT_LIMIT = 65536;

export async function readJsonBody(req, { limit = DEFAULT_LIMIT } = {}) {
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > limit) {
      const err = new Error('payload too large');
      err.code = 'PAYLOAD_TOO_LARGE';
      throw err;
    }
    chunks.push(chunk);
  }
  const raw = Buffer.concat(chunks).toString('utf8');
  if (!raw) {
    return {};
  }
  try {
    return JSON.parse(raw);
  } catch {
    const err = new Error('invalid json');
    err.code = 'INVALID_JSON';
    throw err;
  }
}
