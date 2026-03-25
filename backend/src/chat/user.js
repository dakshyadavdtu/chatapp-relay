import { getSession } from '../auth/session.js';

export async function getUserId(req) {
  const session = await getSession(req);
  return session?.user?.id ?? 'u1';
}
