export function createStorage() {
  function notReady() {
    const err = new Error('storage not ready');
    err.code = 'STORAGE_NOT_READY';
    throw err;
  }

  return {
    ready: false,
    rooms: {
      async get(_id) {
        notReady();
      },
    },
    messages: {
      async add(_message) {
        notReady();
      },
      async listByRoom(_roomId) {
        notReady();
      },
    },
  };
}
