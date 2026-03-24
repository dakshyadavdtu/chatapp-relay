import { apiUrl } from '../config/api.js';

export async function listChats() {
  const res = await fetch(apiUrl('/api/chats'), { credentials: 'include' });
  if (res.status === 404) {
    return { success: false, code: 'NOT_AVAILABLE' };
  }
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(body.error ?? `HTTP ${res.status}`);
    err.status = res.status;
    err.code = body.code;
    throw err;
  }
  return body;
}
