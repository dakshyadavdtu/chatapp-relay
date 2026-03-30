// tracks which connection contexts belong to which userId
const byUser = new Map(); // userId -> Set of ctx

export function registerUserConnection(userId, ctx) {
  if (!userId || !ctx) return;
  if (!byUser.has(userId)) {
    byUser.set(userId, new Set());
  }
  byUser.get(userId).add(ctx);
}

export function removeUserConnection(userId, ctx) {
  const set = byUser.get(userId);
  if (!set) return;
  set.delete(ctx);
  if (set.size === 0) {
    byUser.delete(userId);
  }
}

export function getConnectionsForUser(userId) {
  return byUser.get(userId) ?? new Set();
}

export function isUserOnline(userId) {
  const set = byUser.get(userId);
  return set != null && set.size > 0;
}
