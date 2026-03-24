import { apiUrl } from '../config/api.js';
import { postJson } from './client.js';

export async function fetchSession() {
  try {
    const res = await fetch(apiUrl('/api/me'), { credentials: 'include' });
    const body = await res.json().catch(() => ({}));
    if (res.status === 401) {
      return { authenticated: false };
    }
    if (!res.ok) {
      return { authenticated: false };
    }
    if (body.success && body.data?.user) {
      return { authenticated: true, user: body.data.user };
    }
    return { authenticated: false };
  } catch {
    return { authenticated: false };
  }
}

export async function login(username, password) {
  return postJson('/api/login', { username, password });
}

export async function logout() {
  return postJson('/api/logout', {});
}
