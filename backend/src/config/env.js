function readPort() {
  const raw = process.env.PORT;
  if (raw === undefined || raw === '') {
    return 3000;
  }
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) {
    throw new Error('PORT must be a positive number');
  }
  return n;
}

export function loadConfig() {
  return {
    port: readPort()
  };
}
