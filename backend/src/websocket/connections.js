const byUser = new Map();

export function registerUserConnection(userId, ctx) {
  if (!userId || !ctx) return false;
  let set = byUser.get(userId);
  const firstConnection = !set || set.size === 0;
  if (!set) {
    set = new Set();
    byUser.set(userId, set);
  }
  set.add(ctx);
  return firstConnection;
}

export function removeUserConnection(userId, ctx) {
  const set = byUser.get(userId);
  if (!set) return false;
  set.delete(ctx);
  if (set.size === 0) {
    byUser.delete(userId);
    return true;
  }
  return false;
}

export function getConnectionsForUser(userId) {
  return byUser.get(userId) ?? new Set();
}

export function isUserOnline(userId) {
  const set = byUser.get(userId);
  return set != null && set.size > 0;
}

export function getOnlineUserIds() {
  return [...byUser.keys()];
}

export function forEachConnection(fn) {
  for (const set of byUser.values()) {
    for (const ctx of set) {
      fn(ctx);
    }
  }
}

export function resetConnectionsForTest() {
  byUser.clear();
}
