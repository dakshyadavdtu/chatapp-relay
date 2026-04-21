const startedAt = Date.now();

export function getHealth() {
  return {
    ok: true,
    uptimeMs: Date.now() - startedAt,
    startedAt,
    now: Date.now(),
  };
}
