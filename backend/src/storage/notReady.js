export function storageNotReady() {
  const err = new Error('storage not ready');
  err.code = 'STORAGE_NOT_READY';
  throw err;
}
